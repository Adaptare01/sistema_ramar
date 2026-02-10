
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || "postgres://postgres:postgres@localhost:5432/ramar_db";

const pool = new Pool({
    connectionString,
    ssl: false
});

async function inspect() {
    try {
        const tables = ['volumes', 'carga_itens', 'volume_itens', 'cargas'];
        const results = {};

        for (const table of tables) {
            const res = await pool.query(
                `SELECT column_name, data_type 
                 FROM information_schema.columns 
                 WHERE table_name = $1
                 ORDER BY ordinal_position`,
                [table]
            );
            results[table] = res.rows.map(r => `${r.column_name} (${r.data_type})`);
        }

        fs.writeFileSync('columns.json', JSON.stringify(results, null, 2));
        console.log("Wrote columns.json");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

inspect();
