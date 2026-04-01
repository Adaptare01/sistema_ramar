import { createRequire } from 'module';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente (produção ou desenvolvimento)
if (process.env.NODE_ENV === 'production') {
    // Em produção, variáveis já vêm do environment do Docker
    console.log('[DB] Modo produção — usando variáveis de ambiente do container');
} else {
    // Em desenvolvimento, carregar .env.local
    const envPath = join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('[DB] Modo desenvolvimento — carregou .env.local');
    } else {
        console.warn('[DB] ⚠️ Arquivo .env.local não encontrado');
    }
}

// Suportar tanto DATABASE_URL (padrão Adaptare) quanto POSTGRES_URL (legado MVP)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('❌ CRITICAL: Nenhuma variável DATABASE_URL ou POSTGRES_URL definida!');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: false,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Teste de conexão imediato
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ CRITICAL: Erro de conexão com o PostgreSQL:', err.message);
    } else {
        console.log('✅ Conexão com banco de dados estabelecida com sucesso.');
        release();
    }
});

// Auto-criar tabelas na inicialização (idempotente com IF NOT EXISTS)
async function initDatabase() {
    try {
        const initSqlPath = join(__dirname, '../init_db.sql');
        if (fs.existsSync(initSqlPath)) {
            const sql = fs.readFileSync(initSqlPath, 'utf-8');
            await pool.query(sql);
            console.log('✅ Tabelas do banco verificadas/criadas com sucesso.');
        }
    } catch (err) {
        console.error('⚠️ Erro ao inicializar tabelas (pode já existirem):', err.message);
    }
}

// Executar inicialização
initDatabase();

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
