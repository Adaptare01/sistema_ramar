
import { getClient } from './server/db.js';
import fs from 'fs';

async function backup() {
    let client;
    try {
        client = await getClient();
        console.log('📦 Iniciando backup de CARGAS e ITENS...');

        // 1. Get Cargas
        const resCargas = await client.query('SELECT * FROM cargas');
        const cargas = resCargas.rows;

        // 2. Get Clientes (referenced by cargas)
        const resClientes = await client.query('SELECT * FROM clientes');
        const clientes = resClientes.rows;

        // 3. Get Carga Itens
        const resItens = await client.query('SELECT * FROM carga_itens');
        const itens = resItens.rows;

        // 4. Get Volumes (to save work done so far)
        const resVolumes = await client.query('SELECT * FROM volumes');
        const volumes = resVolumes.rows;

        // 5. Get Volume Itens
        const resVolItens = await client.query('SELECT * FROM volume_itens');
        const volItens = resVolItens.rows;

        const backupData = {
            timestamp: new Date().toISOString(),
            cargas,
            clientes,
            itens,
            volumes,
            volItens
        };

        fs.writeFileSync('backup_orders.json', JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup salvo em 'backup_orders.json'. ${cargas.length} cargas, ${itens.length} itens.`);

    } catch (err) {
        console.error('❌ Erro no backup:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

backup();
