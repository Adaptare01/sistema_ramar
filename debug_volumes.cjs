require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: false
});

async function checkVolumes() {
    try {
        const clientName = 'DAIANA';
        const clientRes = await pool.query("SELECT id, nome FROM clientes WHERE nome LIKE $1", [`%${clientName}%`]);

        if (clientRes.rows.length === 0) {
            console.log('Client not found');
            return;
        }

        const clientId = clientRes.rows[0].id;
        console.log(`Checking volumes for client: ${clientRes.rows[0].nome} (${clientId})`);

        const volRes = await pool.query(
            "SELECT id, numero_sequencial, is_open, created_at FROM volumes WHERE cliente_id = $1 ORDER BY numero_sequencial",
            [clientId]
        );

        console.log('Volume Numbers:', volRes.rows.map(v => v.numero_sequencial));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkVolumes();
