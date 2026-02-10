
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

async function debug() {
    try {
        console.log("Debugging Incremental...");

        // 1. Get Client
        const clientRes = await query("SELECT id, nome FROM clientes WHERE nome ILIKE '%Adaptare Teste%'");
        const client = clientRes.rows[0];
        console.log(`Client: ${client.id}`);

        // 2. Get Carga
        console.log("Querying Carga...");
        const cargaRes = await query("SELECT id FROM cargas ORDER BY data_importacao DESC LIMIT 1");
        if (cargaRes.rows.length === 0) {
            console.log("No cargas found!");
            return;
        }
        const cargaId = cargaRes.rows[0].id;
        console.log(`Carga: ${cargaId}`);

        // 3. Test Query on volumes
        console.log("Querying volumes...");
        await query("SELECT id FROM volumes WHERE carga_id = $1 AND cliente_id = $2 LIMIT 1", [cargaId, client.id]);
        console.log("Success querying volumes.");

        // 4. Test Query on volume_itens
        console.log("Querying volume_itens...");
        await query("SELECT id, quantidade FROM volume_itens LIMIT 1");
        console.log("Success querying volume_itens.");

        // 5. Test Join
        console.log("Querying JOIN...");
        const joinRes = await query(
            `SELECT vi.quantidade 
             FROM volume_itens vi 
             JOIN volumes v ON vi.volume_id = v.id 
             WHERE v.carga_id = $1 AND v.cliente_id = $2
             LIMIT 1`,
            [cargaId, client.id]
        );
        console.log("Success querying JOIN.");

        // 6. Test Aggregation
        console.log("Querying Aggregation...");
        const aggRes = await query(
            `SELECT SUM(vi.quantidade) as total
             FROM volume_itens vi 
             JOIN volumes v ON vi.volume_id = v.id 
             WHERE v.carga_id = $1 AND v.cliente_id = $2`,
            [cargaId, client.id]
        );
        console.log(`Aggregation Result: ${aggRes.rows[0].total}`);

    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        await pool.end();
    }
}

debug();
