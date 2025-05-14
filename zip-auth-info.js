const fs = require("fs");

const zip = fs.readFileSync("auth_info.zip");
const encoded = Buffer.from(zip).toString("base64");

fs.writeFileSync("auth_info_base64.txt", encoded);
console.log("Arquivo auth_info_base64.txt criado com sucesso!");
