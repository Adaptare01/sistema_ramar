
import { getClient } from './server/db.js';

async function clearProducts() {
    let client;
    try {
        client = await getClient();
        console.log('🗑️ Limpando tabela de produtos...');

        await client.query('BEGIN');
        const res = await client.query('DELETE FROM produtos');
        await client.query('COMMIT');

        console.log(`✅ Sucesso! ${res.rowCount} produtos removidos.`);
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Erro ao limpar produtos:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

clearProducts();
