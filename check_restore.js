
import { getClient } from './server/db.js';

async function check() {
    const client = await getClient();
    try {
        const resCargas = await client.query('SELECT COUNT(*) FROM cargas');
        const resClientes = await client.query('SELECT COUNT(*) FROM clientes');
        const resProdutos = await client.query('SELECT COUNT(*) FROM produtos');

        console.log(`Cargas: ${resCargas.rows[0].count}`);
        console.log(`Clientes: ${resClientes.rows[0].count}`);
        console.log(`Produtos: ${resProdutos.rows[0].count}`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

check();
