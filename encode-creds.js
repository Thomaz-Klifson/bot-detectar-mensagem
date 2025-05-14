const fs = require("fs");

const creds = fs.readFileSync("auth_info/creds.json");
const encoded = Buffer.from(creds).toString("base64");

console.log("Copie o conteúdo abaixo e cole como variável de ambiente no Render:");
console.log(encoded);
