
import { query } from './server/db.js';

async function clearCargas() {
    console.log('🗑️  Iniciando limpeza do banco de dados...');
    try {
        const res = await query('DELETE FROM cargas');
        console.log(`✅  Sucesso! ${res.rowCount} cargas (e seus dados vinculados) foram removidas.`);
    } catch (err) {
        console.error('❌  Erro ao limpar banco:', err);
    }
    process.exit(0);
}

clearCargas();
