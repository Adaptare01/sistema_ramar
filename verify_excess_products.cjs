const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://admin_adaptare:Adaptare%2301@31.97.19.108:5433/ramar_sistema?sslmode=disable",
    ssl: false,
});

async function run() {
    try {
        console.log("Connecting to database...");
        // 1. Find Client ID
        const clientRes = await pool.query("SELECT id, nome FROM clientes WHERE nome ILIKE '%Tio Roque%'");
        if (clientRes.rows.length === 0) {
            console.log("Client 'Tio Roque' not found.");
            process.exit(1);
        }
        const client = clientRes.rows[0];
        console.log(`Found Client: ${client.nome} (${client.id})`);

        // 2. Find Load (Carga)
        const loadsRes = await pool.query("SELECT DISTINCT carga_id FROM carga_itens WHERE cliente_id = $1 ORDER BY carga_id DESC LIMIT 1", [client.id]);
        if (loadsRes.rows.length === 0) {
            console.log("No loads found for this client.");
            process.exit(1);
        }
        const cargaId = loadsRes.rows[0].carga_id;
        console.log(`Analyzing Load ID: ${cargaId}`);

        // 3. Get Expected Items (carga_itens)
        const expectedRes = await pool.query(
            "SELECT produto_referencia, produto_nome, quantidade_esperada FROM carga_itens WHERE cliente_id = $1 AND carga_id = $2",
            [client.id, cargaId]
        );
        const expectedMap = new Map();
        expectedRes.rows.forEach(row => {
            const ref = String(row.produto_referencia).trim().replace(/^0+/, '');
            expectedMap.set(ref, {
                nome: row.produto_nome,
                quantidade: parseFloat(row.quantidade_esperada),
                scanned: 0
            });
        });

        // 4. Get Scanned Items (volume_itens JOIN volumes JOIN produtos)
        const scannedRes = await pool.query(
            `SELECT vi.produto_referencia, vi.quantidade, v.numero_sequencial, p.descricao as nome
             FROM volume_itens vi
             JOIN volumes v ON vi.volume_id = v.id
             LEFT JOIN produtos p ON vi.produto_referencia = p.referencia
             WHERE v.cliente_id = $1 AND v.carga_id = $2`,
            [client.id, cargaId]
        );

        console.log(`Found ${scannedRes.rows.length} scanned entries.`);

        const scannedDetails = []; // { ref, qty, volumeId }

        for (const item of scannedRes.rows) {
            const ref = String(item.produto_referencia).trim().replace(/^0+/, '');
            const qty = parseFloat(item.quantidade);
            const volumeId = item.numero_sequencial;
            const nome = item.nome || 'UNKNOWN PRODUCT';

            scannedDetails.push({ ref, qty, volumeId });

            if (expectedMap.has(ref)) {
                expectedMap.get(ref).scanned += qty;
            } else {
                // Extra item
                if (!expectedMap.has(ref)) {
                    expectedMap.set(ref, { nome: nome + ' (EXTRA)', quantidade: 0, scanned: qty, isExtra: true });
                } else {
                    expectedMap.get(ref).scanned += qty;
                }
            }
        }

        // 5. Identify Excess
        console.log("\n--- EXCESS ITEMS REPORT FOR CLIENT: " + client.nome + " ---");
        let hasExcess = false;
        expectedMap.forEach((data, ref) => {
            if (data.scanned > data.quantidade) {
                hasExcess = true;
                const excessQty = data.scanned - data.quantidade;
                console.log(`\nPRODUCT: ${data.nome} (Ref: ${ref})`);
                console.log(`Expected: ${data.quantidade}, Scanned: ${data.scanned}, Excess: ${excessQty}`);
                console.log("Details by Volume:");

                // Find where it was scanned
                const locations = scannedDetails.filter(d => d.ref === ref);
                // Aggregate by volume
                const volMap = {};
                locations.forEach(loc => {
                    volMap[loc.volumeId] = (volMap[loc.volumeId] || 0) + loc.qty;
                });

                Object.keys(volMap).sort().forEach(volId => {
                    console.log(`  - Volume ${volId}: Qty ${volMap[volId]}`);
                });
            }
        });

        if (!hasExcess) console.log("No excess items found.");

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
