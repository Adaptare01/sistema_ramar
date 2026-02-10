
import { getClient } from './server/db.js';
import fs from 'fs';
import path from 'path';

async function resetDb() {
    let client;
    try {
        client = await getClient();
        console.log('🔥 Resetting Database...');

        const sql = fs.readFileSync(path.join(process.cwd(), 'clean_database.sql'), 'utf8');

        await client.query(sql);

        console.log('✅ Database cleaned successfully!');
    } catch (err) {
        console.error('❌ Error resetting database:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

resetDb();
