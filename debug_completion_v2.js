
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Fallback if .env.local not found or variables missing
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/ramar_db";

const pool = new Pool({
    connectionString,
});

async function query(text, params) {
    return pool.query(text, params);
}

async function checkCompletion() {
    try {
        console.log("Checking completion for client 'Adaptare Teste'...");

        // 1. Get client by NAME directly to be sure
        const clientRes = await query("SELECT id, nome FROM clientes WHERE nome ILIKE '%Adaptare Teste%'");
        if (clientRes.rows.length === 0) {
            console.log("Client 'Adaptare Teste' not found!");
            return;
        }
        const client = clientRes.rows[0];
        console.log(`Found Client: ${client.nome} (ID: ${client.id})`);

        // 2. Get Carga ID (latest one)
        const cargaRes = await query("SELECT id FROM cargas ORDER BY created_at DESC LIMIT 1");
        if (cargaRes.rows.length === 0) {
            console.log("No cargas found!");
            return;
        }
        const cargaId = cargaRes.rows[0].id; // 3911...
        console.log(`Checking against latest Carga ID: ${cargaId}`);

        // 3. Calculate Expected Total
        const expectedRes = await query(
            `SELECT SUM(quantidade_esperada) as total_expected
             FROM carga_itens 
             WHERE carga_id = $1 AND cliente_id = $2`,
            [cargaId, client.id]
        );
        const totalExpected = parseFloat(expectedRes.rows[0].total_expected || 0);
        console.log(`Total Expected Items (carga_itens): ${totalExpected}`);

        // 4. Calculate Scanned Total
        const scannedRes = await query(
            `SELECT COALESCE(SUM(vi.quantidade), 0) as total_scanned
             FROM volume_itens vi
             JOIN volumes v ON vi.volume_id = v.id
             WHERE v.carga_id = $1 AND v.cliente_id = $2`,
            [cargaId, client.id]
        );
        const totalScanned = parseFloat(scannedRes.rows[0].total_scanned || 0);
        console.log(`Total Scanned Items (volume_itens): ${totalScanned}`);

        console.log(`Is Completed? ${totalScanned >= totalExpected}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

checkCompletion();
