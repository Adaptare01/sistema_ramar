
import { query } from './server/db.js';

async function migrate() {
    console.log('🔄 Adicionando coluna xml_hash...');
    try {
        await query('ALTER TABLE cargas ADD COLUMN IF NOT EXISTS xml_hash VARCHAR(64)');
        await query('CREATE INDEX IF NOT EXISTS idx_cargas_hash ON cargas(xml_hash)');
        console.log('✅ Coluna Adicionada com Sucesso!');
    } catch (err) {
        console.error('❌ Erro na migração:', err);
    }
    process.exit(0);
}

migrate();
