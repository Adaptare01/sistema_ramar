import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = path.join(__dirname, 'xml_file', 'modelo 02 - Produtos.xls');

console.log(`Inspecting headers of: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log("--- HEADER ROW (Index 0) ---");
        data[0].forEach((col, idx) => {
            console.log(`Index ${idx}: ${col}`);
        });

        if (data.length > 277) {
            console.log("\n--- ROW 277 (Sample) ---");
            data[277].forEach((col, idx) => {
                console.log(`Index ${idx}: ${col}`);
            });
        }
    } else {
        console.log("File is empty");
    }

} catch (e) {
    console.error("Error reading XLS:", e.message);
}
