
import { query, getClient } from './server/db.js';

async function forceAdd() {
    let client;
    try {
        client = await getClient();
        console.log('🚀 Force adding xml_hash column...');

        // Use a simpler query without strict transaction to ensure it runs even if part of it fails
        try {
            await client.query('ALTER TABLE cargas ADD COLUMN xml_hash VARCHAR(64)');
            console.log('✅ Column added.');
        } catch (e) {
            console.log('⚠️ Column might already exist or error:', e.message);
        }

        try {
            await client.query('CREATE INDEX idx_cargas_hash ON cargas(xml_hash)');
            console.log('✅ Index created.');
        } catch (e) {
            console.log('⚠️ Index might already exist or error:', e.message);
        }

    } catch (err) {
        console.error('❌ FATAL ERROR:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

forceAdd();
