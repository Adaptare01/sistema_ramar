
import { query } from './server/db.js';

async function checkSchema() {
    console.log('🔍 Checking cargas table columns...');
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cargas';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error checking schema:', err);
    }
}

checkSchema();
