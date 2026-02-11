import { getClient } from './server/db.js';

async function addInvoiceColumn() {
    let client;
    try {
        client = await getClient();
        console.log('Adding faturado column to conferencias table...');

        await client.query(`
            ALTER TABLE conferencias 
            ADD COLUMN IF NOT EXISTS faturado BOOLEAN DEFAULT FALSE
        `);

        console.log('✅ Column added successfully!');
    } catch (err) {
        console.error('❌ Error adding column:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

addInvoiceColumn();
