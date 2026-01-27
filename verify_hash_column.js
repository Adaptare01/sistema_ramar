
import { query } from './server/db.js';

async function check() {
    try {
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cargas' AND column_name = 'xml_hash';
        `);
        if (res.rows.length > 0) {
            console.log('✅ COLUMN_EXISTS: xml_hash');
        } else {
            console.error('❌ COLUMN_MISSING: xml_hash');
        }
    } catch (err) {
        console.error('❌ ERROR:', err);
    }
    process.exit(0);
}

check();
