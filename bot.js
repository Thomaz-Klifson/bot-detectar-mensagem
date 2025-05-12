const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const nodemailer = require("nodemailer");
require("dotenv").config();
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

        const textoLower = text.toLowerCase();

        // Regex para identificar variações da pergunta sobre o Toledo
        const regexToledo = /algu[eé]m.*(sabe|soube|saber|tem ideia|entendeu)?.*(toledo).*?(saiu|deixou|foi embora|não está|não faz parte|saiu da banda|fora da banda)/;

        // Verifica se mencionaram "meia estudante"
        if (textoLower.includes("meia estudante") || textoLower.includes("meia")) {
            console.log("Frase detectada: 'meia estudante'");
            const mensagem = `🚨 Alerta! Alguém disse "meia estudante" no grupo/conversa: ${msg.key.remoteJid}`;
            await enviarEmail(mensagem);
        }

        // Verifica se perguntaram sobre o Toledo
        else if (regexToledo.test(textoLower)) {
            console.log("Frase detectada: 'Toledo saiu da banda'");

            const explicacao = `O ex guitarrista do supercombo, Pedro Ramos (Toledo), foi desligado da banda.
Aparentemente ele apareceu no Studio de ensaios, para gravação do novo álbum, bêbado e em posse de uma pistola. 
Os colegas de banda se assustaram, incluindo, Paulo Vaz, que fez um twitter explicando a situação. 
Na publicação diz que o músico apareceu bêbado e mostrou uma pistola para os seus colegas de banda. Continuou falando que ultimamente ele já havia demonstrado alguns comportamentos violentos por conta das críticas injustas que vinha recebendo, mas nunca algo nesse nível. 
Eles não chegaram a chamar a polícia, mas foram falar com os empresários da banda que, decidiram pelo desligamento por. 
Vaz ainda disse em seu twitter que o próprio Toledo foi na casa do Léo Ramos conversar com ele sobre a situação.
Ele o questionou do porque Toledo ter levado uma pistola, prontamente negou dizendo que não levou. Léo então meteu a mão nas genitálias dele e perguntou: "E esse pistolão aqui?"`;

            await sock.sendMessage(msg.key.remoteJid, { text: explicacao }, { quoted: msg });
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
