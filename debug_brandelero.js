
import { getClient } from './server/db.js';

async function run() {
    const client = await getClient();
    try {
        console.log("🔍 Investigating Brandelero load...");

        // 1. Find the load
        const resCarga = await client.query("SELECT * FROM cargas WHERE nome_arquivo ILIKE '%brandelero%' OR nome_arquivo ILIKE '%brandeleiro%' LIMIT 1");
        if (resCarga.rows.length === 0) {
            console.log("❌ Carga not found.");
            return;
        }
        const carga = resCarga.rows[0];
        console.log(`📦 Carga: ${carga.nome_arquivo} (ID: ${carga.id})`);

        // 2. Get Expected Items (Carga Itens) for Ref 2316
        const resExpected = await client.query(`
            SELECT produto_referencia, produto_nome, quantidade_esperada
            FROM carga_itens
            WHERE carga_id = $1 AND produto_referencia LIKE '%2316%'
        `, [carga.id]);

        console.log("\n📋 Expected Items (carga_itens):");
        resExpected.rows.forEach(r => {
            console.log(`   - Ref: '${r.produto_referencia}' (Len: ${r.produto_referencia.length}) | ${r.produto_nome}`);
        });

        // 3. Get Scanned Items (Volume Itens) for Ref 2316 in this load
        // Need to join volumes
        const resScanned = await client.query(`
            SELECT vi.produto_referencia, vi.produto_ean, vi.quantidade
            FROM volume_itens vi
            JOIN volumes v ON vi.volume_id = v.id
            WHERE v.carga_id = $1 AND vi.produto_referencia LIKE '%2316%'
        `, [carga.id]);

        console.log("\n📷 Scanned Items (volume_itens):");
        if (resScanned.rows.length === 0) {
            console.log("   (None scanned yet for 2316)");
        }
        resScanned.rows.forEach(r => {
            console.log(`   - Ref: '${r.produto_referencia}' (Len: ${r.produto_referencia.length}) | EAN: '${r.produto_ean}'`);
        });

        // 4. Check Products table for 2316
        const resProd = await client.query(`
            SELECT referencia, descricao, ean
            FROM produtos
            WHERE referencia LIKE '%2316%'
        `);
        console.log("\n📦 Products in DB (Ref 2316):");
        resProd.rows.forEach(r => {
            console.log(`   - Ref: '${r.referencia}' (Len: ${r.referencia.length}) | Desc: ${r.descricao} | EAN: '${r.ean}'`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
