
import { getClient } from './server/db.js';

async function checkEANs() {
    const client = await getClient();
    try {
        console.log('📦 Verificando EANs dos produtos da carga Amarildo...');

        const res = await client.query(`
            SELECT DISTINCT p.referencia, p.descricao, p.ean
            FROM carga_itens ci
            JOIN cargas c ON ci.carga_id = c.id
            JOIN produtos p ON ci.produto_referencia = p.referencia
            WHERE c.nome_arquivo ILIKE '%amarildo%'
            ORDER BY p.referencia
            LIMIT 20
        `);

        if (res.rows.length === 0) {
            console.log('Nenhum produto encontrado para esta carga.');
        } else {
            console.log('Amostra de produtos (Ref | Desc | EAN):');
            res.rows.forEach(r => {
                console.log(`${r.referencia.padEnd(15)} | ${r.descricao.substring(0, 30).padEnd(30)} | '${r.ean}'`);
            });
        }

        // Count items with empty EANs
        const resCount = await client.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN p.ean IS NULL OR p.ean = '' THEN 1 END) as empty_ean
            FROM carga_itens ci
            JOIN cargas c ON ci.carga_id = c.id
            JOIN produtos p ON ci.produto_referencia = p.referencia
            WHERE c.nome_arquivo ILIKE '%amarildo%'
        `);

        console.log('\nEstatísticas:');
        console.log(`Total de itens únicos: ${resCount.rows[0].total}`);
        console.log(`Itens com EAN vazio: ${resCount.rows[0].empty_ean}`);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkEANs();
