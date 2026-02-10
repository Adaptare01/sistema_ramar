
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ramar_db";

const pool = new Pool({
    connectionString,
    ssl: false
});

async function inspect() {
    try {
        const tables = ['volumes', 'volume_itens', 'carga_itens'];

        for (const table of tables) {
            console.log(`\n--- TABLE: ${table} ---`);
            const res = await pool.query(
                `SELECT column_name, data_type 
                 FROM information_schema.columns 
                 WHERE table_name = $1
                 ORDER BY ordinal_position`,
                [table]
            );
            res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

inspect();
