const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");  // Importando a função correta
const qrcode = require("qrcode-terminal");
const nodemailer = require("nodemailer");
require('dotenv').config();  // Importando para carregar variáveis de ambiente do arquivo .env

async function enviarEmail(mensagem) {
    try {
        console.log("Tentando criar o transporter...");

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,  // Variável de ambiente para o e-mail
                pass: process.env.GMAIL_PASS,  // Variável de ambiente para a senha ou senha de app
            }
        });

        console.log("Transporter criado, tentando enviar e-mail...");

        let info = await transporter.sendMail({
            from: `"Comprar ingresso - Show Nova Orquestra Casa Natura" <${process.env.GMAIL_USER}>`,  // E-mail remetente
            to: process.env.DEST_EMAIL,                         // E-mail destinatário
            subject: 'Alerta: Frase Detectada no WhatsApp',    // Assunto do e-mail
            text: mensagem,                                    // Corpo do e-mail com a mensagem
        });

        console.log('E-mail enviado: ' + info.response);  // Log da resposta do envio
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);  // Captura e log de qualquer erro
    }
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        console.log("Mensagem recebida:", msg.message);  // Adicionando log para depuração

        let text = '';

        if (msg.message?.conversation) {
            text = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
            text = msg.message.extendedTextMessage.text;
        }

        if (text.toLowerCase().includes("meia estudante") || text.toLowerCase().includes("meia")) {
            console.log("Frase detectada: 'meia estudante'");  // Log para depuração
            const mensagem = `🚨 Alerta! Alguém disse "meia estudante" no grupo/conversa: ${msg.key.remoteJid}`;
            
            await enviarEmail(mensagem);
        }
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === "close") iniciarBot();
    });
}

iniciarBot();
