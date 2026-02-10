
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ramar_db";

const pool = new Pool({
    connectionString,
    ssl: false
});

async function query(text, params) {
    return pool.query(text, params);
}

async function check() {
    try {
        console.log("Debugging Full Status...");

        // 1. Get Client
        const clientRes = await query("SELECT id, nome FROM clientes WHERE nome ILIKE '%Adaptare Teste%'");
        const client = clientRes.rows[0];
        console.log(`Client: ${client.nome} (${client.id})`);

        // 2. Get Carga
        const cargaRes = await query("SELECT id FROM cargas ORDER BY data_importacao DESC LIMIT 1");
        const cargaId = cargaRes.rows[0].id;
        console.log(`Carga ID: ${cargaId}`);

        // 3. Expected Total
        const expectedRes = await query(
            `SELECT SUM(quantidade_esperada) as total_expected
             FROM carga_itens 
             WHERE carga_id = $1 AND cliente_id = $2`,
            [cargaId, client.id]
        );
        const totalExpected = parseFloat(expectedRes.rows[0].total_expected || 0);

        // 4. Scanned Total
        const scannedRes = await query(
            `SELECT COALESCE(SUM(vi.quantidade), 0) as total_scanned
             FROM volume_itens vi
             JOIN volumes v ON vi.volume_id = v.id
             WHERE v.carga_id = $1 AND v.cliente_id = $2`,
            [cargaId, client.id]
        );
        const totalScanned = parseFloat(scannedRes.rows[0].total_scanned || 0);

        console.log(`Expected: ${totalExpected}`);
        console.log(`Scanned: ${totalScanned}`);
        console.log(`Is Completed? ${totalScanned >= totalExpected}`);
        console.log(`JSON Check: isCompleted=${totalScanned >= totalExpected ? 'true' : 'false'} (totalExpected=${totalExpected})`);

    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        await pool.end();
    }
}

check();
