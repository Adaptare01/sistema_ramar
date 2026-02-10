
import { query, getClient } from './server/db.js';

async function checkSchema() {
    const client = await getClient();
    try {
        const tables = ['cargas', 'volumes', 'volume_itens'];
        for (const table of tables) {
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            console.log(`\nTable: ${table}`);
            res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkSchema();
