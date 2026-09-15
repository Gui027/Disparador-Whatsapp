import Link from "next/link";
import { ArrowLeft, Lock, Shield } from "lucide-react";

export const metadata = {
    title: "Política de Privacidade | WA-AKG",
    description: "Política de Privacidade do Gateway WhatsApp auto-hospedado WA-AKG. Arquitetura sem rastreamento, propriedade dos dados e práticas de segurança.",
    openGraph: {
        title: "Política de Privacidade | WA-AKG",
        description: "Política de Privacidade do Gateway WhatsApp auto-hospedado WA-AKG.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Política de Privacidade | WA-AKG",
        description: "Política de Privacidade do Gateway WhatsApp auto-hospedado WA-AKG.",
    },
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden py-24 selection:bg-primary/30 selection:text-primary-foreground">
            {/* Ambient background glows */}
            <div className="fixed top-0 right-1/4 translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-0 left-1/4 -translate-x-1/2 translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="container max-w-4xl px-4 mx-auto relative z-10">

                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors group">
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Voltar para o Início
                </Link>

                <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Shield className="h-8 w-8 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Política de Privacidade</h1>
                            <p className="text-muted-foreground mt-2">Data de vigência: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 prose-p:leading-relaxed">

                        <p className="lead text-lg text-muted-foreground mb-8">
                            No WA-AKG, acreditamos que seus dados são sua propriedade. Esta Política de Privacidade detalha os limites estritos sobre como as informações são tratadas ao usar nosso Gateway WhatsApp open-source e auto-hospedado.
                        </p>

                        <h2 className="flex items-center gap-2 mt-8 text-2xl border-b pb-2">
                            <Lock className="h-6 w-6 text-blue-500" />
                            1. Arquitetura Sem Rastreamento
                        </h2>
                        <p>
                            Como o WA-AKG foi projetado para ser <strong>auto-hospedado</strong>, todo o processamento principal de dados ocorre exclusivamente no hardware onde você implanta a aplicação.
                        </p>
                        <ul>
                            <li><strong>Sem Telemetria Centralizada:</strong> Os criadores do WA-AKG não recebem telemetria, análises ou relatórios de uso sobre suas interações no WhatsApp.</li>
                            <li><strong>Propriedade Absoluta dos Dados:</strong> Seus contatos, mensagens, agendamentos e respostas automáticas permanecem no seu próprio banco de dados. Não podemos e não iremos acessá-los.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">2. Dados Que Processamos Localmente</h2>
                        <p>
                            Ao implantar o gateway, a aplicação em execução no seu servidor interage com:
                        </p>
                        <ul>
                            <li><strong>Credenciais de Autenticação:</strong> As senhas que você cria para o painel são criptografadas com segurança usando bcrypt antes de serem armazenadas no seu banco de dados local.</li>
                            <li><strong>Sessões do WhatsApp:</strong> O WA-AKG atua como uma ponte para o WhatsApp Web. Os tokens de sessão (chaves) necessários para manter essa conexão são armazenados localmente no seu servidor.</li>
                            <li><strong>Registros de Comunicação:</strong> Mensagens enviadas e recebidas por meio do gateway são registradas no seu banco de dados local para fornecer dados históricos e funcionalidade de webhook.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">3. Protegendo Suas Informações</h2>
                        <p>
                            Embora o WA-AKG seja construído com práticas modernas de segurança, a segurança final dos seus dados depende do seu ambiente de hospedagem. Recomendamos fortemente:
                        </p>
                        <ul>
                            <li>Implantar a aplicação atrás de um proxy reverso com <strong>criptografia SSL/TLS</strong> obrigatória (HTTPS).</li>
                            <li>Proteger o servidor host com firewalls e autenticação por chave SSH.</li>
                            <li>Manter o sistema operacional subjacente e o ambiente Node.js sempre atualizados.</li>
                        </ul>

                        <h2 className="mt-8 text-2xl border-b pb-2">4. Integrações com Terceiros</h2>
                        <p>
                            O WA-AKG utiliza a biblioteca <code>@whiskeysockets/baileys</code> para se comunicar diretamente com os servidores do WhatsApp. Ao usar este gateway, seu servidor estabelecerá uma conexão web-socket direta com o WhatsApp. Esteja ciente de que o uso do WhatsApp ainda está sujeito à Política de Privacidade da Meta.
                        </p>

                        <div className="mt-12 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                            <p className="font-semibold mb-2">Precisa de mais detalhes?</p>
                            <p className="text-sm text-muted-foreground mb-0">Se você tiver dúvidas específicas sobre o tratamento de dados ou desejar auditar o código, visite nosso <Link href="https://github.com/mrifqidaffaaditya/WA-AKG">Repositório no GitHub</Link>.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
