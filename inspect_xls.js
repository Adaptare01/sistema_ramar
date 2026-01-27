import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = path.join(__dirname, 'xml_file', 'modelo 02 - Produtos.xls');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assume first sheet
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON to see structure
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Header: 1 returns array of arrays

    if (data.length > 0) {
        console.log("Headers:", data[0]);
        if (data.length > 1) {
            console.log("First Row:", data[1]);
        }
    } else {
        console.log("Empty Sheet");
    }

} catch (err) {
    console.error("Error reading XLS:", err);
}
