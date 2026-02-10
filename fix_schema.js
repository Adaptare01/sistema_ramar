
import { getClient } from './server/db.js';

async function fixSchema() {
    let client;
    try {
        client = await getClient();
        console.log('🔧 Fixing schema...');

        // Cargas
        await client.query('ALTER TABLE cargas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
        await client.query('ALTER TABLE cargas ADD COLUMN IF NOT EXISTS data_importacao TIMESTAMP DEFAULT NOW()');
        await client.query('ALTER TABLE cargas ADD COLUMN IF NOT EXISTS xml_hash TEXT');

        // Volumes
        await client.query('ALTER TABLE volumes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
        await client.query('ALTER TABLE volumes ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP');

        // Volume Itens
        await client.query('ALTER TABLE volume_itens ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');

        // Clientes (Just to be safe, likely id/nome only)

        console.log('✅ Schema fixed!');
    } catch (err) {
        console.error('❌ Error fixing schema:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

fixSchema();
