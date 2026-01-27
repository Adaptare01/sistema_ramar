
import { query } from './server/db.js';

async function testConnection() {
    console.log('--- START DEBUG ---');
    try {
        const res = await query('SELECT count(*) FROM cargas');
        console.log(`[DEBUG_RESULT] Total Cargas in DB: ${res.rows[0].count}`);
    } catch (err) {
        console.error('ERROR querying database:', err);
    }
    console.log('--- END DEBUG ---');
    process.exit(0);
}

testConnection();
