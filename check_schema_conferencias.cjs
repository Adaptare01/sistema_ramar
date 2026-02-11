const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://admin_adaptare:Adaptare%2301@31.97.19.108:5433/ramar_sistema?sslmode=disable",
    ssl: false,
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'conferencias'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
