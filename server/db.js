import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const { Pool } = pkg;

// Configuração estrita conforme padrão Adaptare
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: false, // OBRIGATÓRIO: Desliga SSL para conexão via IP direto
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Teste de conexão imediato para validar infraestrutura
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ CRITICAL: Erro de conexão com o PostgreSQL:', err.message);
        if (err.message.includes('self-signed')) {
            console.error('DICA: Verifique se ssl: false está configurado corretamente.');
        }
    } else {
        console.log('✅ Conexão com banco de dados estabelecida com sucesso (Padrão Adaptare).');
        release();
    }
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
