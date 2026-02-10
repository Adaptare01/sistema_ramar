
import fs from 'fs';

try {
    const data = JSON.parse(fs.readFileSync('backup_orders.json', 'utf8'));
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`Clientes: ${data.clientes ? data.clientes.length : 'undefined'}`);
    console.log(`Cargas: ${data.cargas ? data.cargas.length : 'undefined'}`);
    console.log(`Itens: ${data.itens ? data.itens.length : 'undefined'}`);
    console.log(`Volumes: ${data.volumes ? data.volumes.length : 'undefined'}`);
    console.log(`Volume Itens: ${data.volItens ? data.volItens.length : 'undefined'}`);
} catch (err) {
    console.error('Error reading backup file:', err);
}
