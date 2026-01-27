import { getClient } from './server/db.js';

async function verifyProducts() {
    const client = await getClient();
    try {
        console.log('--- BUSCANDO EANS ESPECÍFICOS ---');
        const res = await client.query("SELECT * FROM produtos WHERE ean IN ('7898962128664', '7898962128183')");
        if (res.rows.length === 0) {
            console.log('❌ NENHUM PRODUTO ENCONTRADO com esses EANs.');
        } else {
            console.log('✅ Produtos encontrados:', res.rows);
        }

        console.log('\n--- AMOSTRA DE PRODUTOS NO BANCO ---');
        const sample = await client.query('SELECT * FROM produtos LIMIT 10');
        console.table(sample.rows);

    } catch (err) {
        console.error('Erro na verificação:', err);
    } finally {
        client.release();
    }
}

verifyProducts();
