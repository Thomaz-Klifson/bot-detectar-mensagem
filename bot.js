const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys"); 
const qrcode = require("qrcode-terminal");
const nodemailer = require("nodemailer");
require('dotenv').config();
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

async function enviarEmail(mensagem) {
    try {
        console.log("Tentando criar o transporter...");

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            }
        });

        console.log("Transporter criado, tentando enviar e-mail...");

        let info = await transporter.sendMail({
            from: `"Comprar ingresso - Show Nova Orquestra Casa Natura" <${process.env.GMAIL_USER}>`,
            to: process.env.DEST_EMAIL,
            subject: 'Alerta: Frase Detectada no WhatsApp',
            text: mensagem,
        });

        console.log('E-mail enviado: ' + info.response);
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
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
        console.log("Mensagem recebida:", msg.message);

        let text = '';

        if (msg.message?.conversation) {
            text = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
            text = msg.message.extendedTextMessage.text;
        }

        if (text.toLowerCase().includes("meia estudante") || text.toLowerCase().includes("meia")) {
            console.log("Frase detectada: 'meia estudante'");
            const mensagem = `🚨 Alerta! Alguém disse "meia estudante" no grupo/conversa: ${msg.key.remoteJid}`;
            
            await enviarEmail(mensagem);
        }
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) qrcode.generate(qr, { small: true });

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            if (shouldReconnect) {
                console.log("Reconectando...");
                iniciarBot();
            } else {
                console.log("Erro de autenticação, sessão inválida.");
            }
        }
    });
}

iniciarBot();
