
import { getClient } from './server/db.js';

async function run() {
    const client = await getClient();
    try {
        console.log('🔄 Creating conferencias table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS conferencias (
                id UUID PRIMARY KEY,
                carga_id UUID NOT NULL REFERENCES cargas(id),
                cliente_id VARCHAR(255) NOT NULL REFERENCES clientes(id),
                status TEXT DEFAULT 'FINALIZADA',
                resumo JSONB, -- Stores the counts (expected, scanned, extra, etc)
                report_snapshot JSONB, -- Stores the full list of discrepancies if needed
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Table conferencias created.');

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
