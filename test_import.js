import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const xmlPath = path.join(__dirname, 'xml_file', 'MinutaCarregamentoImpressao.xml');

console.log(`Lendo arquivo: ${xmlPath}`);

try {
    if (!fs.existsSync(xmlPath)) {
        console.error("Arquivo não encontrado!");
        process.exit(1);
    }

    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

    console.log("Enviando para API...");

    fetch('http://localhost:3001/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent, fileName: 'MinutaCarregamentoImpressao.xml' })
    })
        .then(async r => {
            console.log(`Status Code: ${r.status} ${r.statusText}`);
            const text = await r.text();
            try {
                const data = JSON.parse(text);
                console.log("Resposta da API:", JSON.stringify(data, null, 2));
            } catch (e) {
                console.error("Resposta não é JSON:", text);
            }
        })
        .catch(err => {
            console.error("Erro na requisição:", err);
        });

} catch (err) {
    console.error("Erro ao ler arquivo:", err);
}
