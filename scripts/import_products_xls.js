import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: false,
});

const filePath = path.join(__dirname, '../xml_file', 'modelo 02 - Produtos.xls');

async function importProducts() {
    console.log(`Lendo arquivo: ${filePath}`);
    const client = await pool.connect();

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // Use header: 1 to get array of arrays
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`Encontradas ${data.length} linhas.`);

        // await client.query('BEGIN'); // Removed to debug individual errors

        let updated = 0;
        let inserted = 0;
        let errors = 0;

        // Start from index 1 to skip header (assuming index 0 is header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            // Map by index based on explicit inspection (Step 851)
            // 0:codgru, 1:codsub, 2:codpro(REF), 3:despro(DESC), 4:unipro, 5:codbar(EAN)
            const ref = String(row[2] || '').trim();
            const desc = String(row[3] || '').trim();
            let ean = String(row[5] || '').trim();

            if (!ref) continue;

            // Optional: Skip if EAN is empty? The user wants EAN, but maybe some products don't have it.
            // We still update description if possible.

            if (ean.length > 20) {
                console.warn(`Aviso: EAN truncado na linha ${i} (Original: '${ean}')`);
                ean = ean.substring(0, 20);
            }

            try {
                const newId = randomUUID();
                const res = await client.query(
                    `INSERT INTO produtos (id, referencia, descricao, ean)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (referencia) 
                     DO UPDATE SET 
                        descricao = EXCLUDED.descricao,
                        ean = EXCLUDED.ean
                     RETURNING (xmax = 0) AS inserted`,
                    [newId, ref, desc, ean]
                );

                if (res.rows[0].inserted) inserted++;
                else updated++;
            } catch (e) {
                console.error(`Erro na linha ${i} (Ref: ${ref}):`, e.message);
                errors++;
            }

            if ((inserted + updated) % 100 === 0) process.stdout.write('.');
        }

        await client.query('COMMIT');
        console.log(`\nImportação Concluída!`);
        console.log(`Linhas processadas: ${data.length - 1}`);
        console.log(`Inseridos: ${inserted}`);
        console.log(`Atualizados: ${updated}`);
        console.log(`Erros: ${errors}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro fatal na importação:", err);
    } finally {
        client.release();
        pool.end();
    }
}

importProducts();
