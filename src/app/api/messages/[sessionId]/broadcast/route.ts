import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { waManager } from "@/modules/whatsapp/manager";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";
import type { AnyMessageContent } from "@whiskeysockets/baileys";
import { z } from "zod";

const broadcastBodySchema = z.object({
    recipients: z.array(z.string()),
    message: z.string().min(1),
    delay: z.number().optional()
});

const NOT_ON_WHATSAPP = "Número não encontrado no WhatsApp";
const MAX_ATTEMPTS = 3;
const SOCKET_WAIT_MS = 45000;
const SOCKET_POLL_INTERVAL_MS = 1500;

// Espera a sessão reconectar caso o socket tenha caído momentaneamente (reconexão automática do Baileys)
async function waitForSocket(instance: { socket: any }, maxWaitMs: number) {
    const deadline = Date.now() + maxWaitMs;
    while (!instance.socket && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, SOCKET_POLL_INTERVAL_MS));
    }
    return instance.socket;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json({ status: false, message: "Unauthorized", error: "Unauthorized" }, { status: 401 });
        }

        const { sessionId } = await params;
        const body = await request.json();

        const parseResult = broadcastBodySchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
        }

        const { recipients, message, delay } = parseResult.data;

        const canAccess = await canAccessSession(user.id, user.role, sessionId);
        if (!canAccess) {
            return NextResponse.json({ status: false, message: "Forbidden", error: "Forbidden" }, { status: 403 });
        }

        const instance = waManager.getInstance(sessionId);
        if (!instance?.socket) {
            return NextResponse.json({ status: false, message: "Session not ready", error: "Session not ready" }, { status: 503 });
        }

        // Evita reenviar para quem já recebeu mensagem com sucesso em uma transmissão anterior nesta sessão
        const alreadySentRows = await prisma.broadcastRecipient.findMany({
            where: { status: "sent", broadcastLog: { sessionId }, jid: { in: recipients } },
            select: { jid: true },
            distinct: ["jid"]
        });
        const alreadySentSet = new Set(alreadySentRows.map(r => r.jid));

        const pendingRecipients = recipients.filter(jid => !alreadySentSet.has(jid));
        const skippedRecipients = recipients.filter(jid => alreadySentSet.has(jid));

        // --- Save BroadcastLog & recipients to DB ---
        const log = await prisma.broadcastLog.create({
            data: {
                sessionId,
                message,
                total: recipients.length,
                skipped: skippedRecipients.length,
                delay: delay || 2000,
                status: "running",
                recipients: {
                    create: [
                        ...pendingRecipients.map(jid => ({ jid, status: "pending" })),
                        ...skippedRecipients.map(jid => ({ jid, status: "skipped", error: "Já recebeu essa mensagem em uma transmissão anterior" }))
                    ]
                }
            },
            include: { recipients: true }
        });

        const messageContent: AnyMessageContent = { text: message };
        const io = (global as any).io;
        const broadcastId = log.id;
        const skipped = skippedRecipients.length;

        // Emit initial state
        if (io) {
            io.to(sessionId).emit("broadcast.progress", {
                broadcastId,
                status: "running",
                total: recipients.length,
                sent: 0,
                failed: 0,
                skipped,
                current: null,
                progress: skipped > 0 ? Math.round((skipped / recipients.length) * 100) : 0,
                startedAt: log.startedAt.toISOString()
            });
        }

        // Process in background — update DB as we go
        (async () => {
            let sent = 0;
            let failed = 0;
            const errors: { jid: string; error: string }[] = [];

            for (let i = 0; i < pendingRecipients.length; i++) {
                const jid = pendingRecipients[i];
                let lastError = "Unknown error";
                let succeeded = false;

                for (let attempt = 1; attempt <= MAX_ATTEMPTS && !succeeded; attempt++) {
                    try {
                        let sock = instance.socket;
                        if (!sock) {
                            sock = await waitForSocket(instance, SOCKET_WAIT_MS);
                        }
                        if (!sock) {
                            throw new Error("Sessão do WhatsApp desconectada — não foi possível reconectar a tempo");
                        }

                        const checkResult = await sock.onWhatsApp(jid);
                        const result = Array.isArray(checkResult) && checkResult.length > 0 ? checkResult[0] : null;

                        if (!result?.exists) {
                            lastError = NOT_ON_WHATSAPP;
                            break; // não adianta tentar de novo — número realmente não existe
                        }

                        await sock.sendMessage(result.jid, messageContent);
                        succeeded = true;
                    } catch (e: any) {
                        lastError = e.message || "Unknown error";
                        console.error(`Broadcast attempt ${attempt}/${MAX_ATTEMPTS} failed for ${jid}`, e);
                        if (attempt < MAX_ATTEMPTS) {
                            await new Promise(r => setTimeout(r, 2000 * attempt));
                        }
                    }
                }

                if (succeeded) {
                    sent++;
                    await prisma.broadcastRecipient.updateMany({
                        where: { broadcastLogId: broadcastId, jid },
                        data: { status: "sent", sentAt: new Date() }
                    });
                } else {
                    failed++;
                    errors.push({ jid, error: lastError });
                    await prisma.broadcastRecipient.updateMany({
                        where: { broadcastLogId: broadcastId, jid },
                        data: { status: "failed", error: lastError }
                    });
                }

                const progress = Math.round(((sent + failed + skipped) / recipients.length) * 100);

                // Update BroadcastLog progress in DB
                await prisma.broadcastLog.update({
                    where: { id: broadcastId },
                    data: { sent, failed }
                });

                // Socket real-time
                if (io) {
                    io.to(sessionId).emit("broadcast.progress", {
                        broadcastId,
                        status: "running",
                        total: recipients.length,
                        sent,
                        failed,
                        skipped,
                        current: jid,
                        progress
                    });
                }

                // Delay between sends
                if (i < pendingRecipients.length - 1) {
                    const baseDelay = delay || 2000;
                    const randomDelay = baseDelay + Math.floor(Math.random() * (baseDelay * 0.5));
                    await new Promise(r => setTimeout(r, randomDelay));
                }
            }

            // Mark as completed in DB
            await prisma.broadcastLog.update({
                where: { id: broadcastId },
                data: { status: "completed", sent, failed, completedAt: new Date() }
            });

            // Final socket emit
            if (io) {
                io.to(sessionId).emit("broadcast.progress", {
                    broadcastId,
                    status: "completed",
                    total: recipients.length,
                    sent,
                    failed,
                    skipped,
                    errors,
                    progress: 100,
                    completedAt: new Date().toISOString()
                });
            }
            console.log(`Broadcast ${broadcastId} completed: ${sent} sent, ${failed} failed, ${skipped} skipped (already sent) out of ${recipients.length}`);
        })();

        return NextResponse.json({
            status: true,
            message: "Broadcast started",
            data: { broadcastId: log.id, total: recipients.length, skipped }
        });

    } catch (e) {
        console.error("Broadcast error", e);
        return NextResponse.json({ status: false, message: "Failed to start broadcast", error: "Failed to start broadcast" }, { status: 500 });
    }
}
