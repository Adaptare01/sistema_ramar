import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = path.join(__dirname, 'xml_file', 'modelo 02 - Produtos.xls');

console.log(`Checking file: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const targets = ['7898962128664', '7898962128183'];
    console.log(`Searching for: ${targets.join(', ')}`);

    let found = 0;

    // Start from 1 to skip header
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        // 0: REF, 1: DESC, 2: UN, 3: EAN
        const ean = String(row[3] || '').trim();

        if (targets.includes(ean)) {
            console.log(`✅ FOUND in ROW ${i}: Ref=${row[0]}, Desc=${row[1]}, EAN=${ean}`);
            found++;
        }
    }

    if (found === 0) {
        console.log("❌ NONE of the EANs were found in the XLS file.");
        console.log("--- First 10 EANs in file ---");
        for (let i = 1; i < Math.min(data.length, 11); i++) {
            const ean = String(data[i][3] || '').trim();
            console.log(`Row ${i}: '${ean}' (Ref: ${data[i][0]})`);
        }
    }

} catch (e) {
    console.error("Error reading XLS:", e.message);
}
