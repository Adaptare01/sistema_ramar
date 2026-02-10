
import { getClient } from './server/db.js';

async function run() {
    const client = await getClient();
    try {
        console.log('🔍 Checking ID types...');

        // Check Cargas ID type
        const resCargas = await client.query("SELECT pg_typeof(id) FROM cargas LIMIT 1");
        if (resCargas.rows.length > 0) {
            console.log(`Cargas ID Type: ${resCargas.rows[0].pg_typeof}`);
        } else {
            console.log("Cargas table empty, checking columns...");
            const colRes = await client.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'cargas' AND column_name = 'id'");
            console.log(`Cargas ID Schema Type: ${colRes.rows[0]?.data_type}`);
        }

        // Check Clientes ID type
        const resClientes = await client.query("SELECT pg_typeof(id) FROM clientes LIMIT 1");
        if (resClientes.rows.length > 0) {
            console.log(`Clientes ID Type: ${resClientes.rows[0].pg_typeof}`);
        } else {
            const colRes = await client.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'id'");
            console.log(`Clientes ID Schema Type: ${colRes.rows[0]?.data_type}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
