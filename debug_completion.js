import { query } from './server/db.js';

async function checkCompletion() {
    try {
        console.log("Checking completion for client 'Adaptare Teste' (ID: 0001)...");

        // 1. Get client ID from database
        const clientRes = await query("SELECT id, nome FROM clientes WHERE id = '0001'");
        if (clientRes.rows.length === 0) {
            console.log("Client not found!");
            return;
        }
        const client = clientRes.rows[0];
        console.log(`Found Client: ${client.nome} (UUID: ${client.id})`);

        // 2. Get Carga ID (assuming the latest one or a specific one)
        const cargaRes = await query("SELECT id FROM cargas ORDER BY created_at DESC LIMIT 1");
        if (cargaRes.rows.length === 0) {
            console.log("No cargas found!");
            return;
        }
        const cargaId = cargaRes.rows[0].id;
        console.log(`Checking against latest Carga ID: ${cargaId}`);

        // 3. Calculate Expected Total
        const expectedRes = await query(
            `SELECT SUM(quantidade_esperada) as total_expected
             FROM carga_itens 
             WHERE carga_id = $1 AND cliente_id = $2`,
            [cargaId, client.id]
        );
        const totalExpected = parseFloat(expectedRes.rows[0].total_expected || 0);
        console.log(`Total Expected Items: ${totalExpected}`);

        // 4. Calculate Scanned Total
        const scannedRes = await query(
            `SELECT COALESCE(SUM(vi.quantidade), 0) as total_scanned
             FROM volume_itens vi
             JOIN volumes v ON vi.volume_id = v.id
             WHERE v.carga_id = $1 AND v.cliente_id = $2`,
            [cargaId, client.id]
        );
        const totalScanned = parseFloat(scannedRes.rows[0].total_scanned || 0);
        console.log(`Total Scanned Items: ${totalScanned}`);

        console.log(`Is Completed? ${totalScanned >= totalExpected}`);

    } catch (err) {
        console.error("Error:", err);
    }
}

checkCompletion();
