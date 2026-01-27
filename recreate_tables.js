
import { query, getClient } from './server/db.js';

async function recreate() {
    let client;
    try {
        client = await getClient();
        console.log('🔥 Dropping tables...');

        await client.query('DROP TABLE IF EXISTS volume_itens CASCADE');
        await client.query('DROP TABLE IF EXISTS volumes CASCADE');
        await client.query('DROP TABLE IF EXISTS carga_itens CASCADE');
        await client.query('DROP TABLE IF EXISTS cargas CASCADE');
        // We can keep clientes and produtos if we want, but cleaner to reset all for consistency
        await client.query('DROP TABLE IF EXISTS clientes CASCADE');
        await client.query('DROP TABLE IF EXISTS produtos CASCADE');

        console.log('🏗️ Recreating tables...');

        await client.query(`
            CREATE TABLE cargas (
                id UUID PRIMARY KEY,
                nome_arquivo TEXT,
                status TEXT,
                total_itens NUMERIC,
                created_at TIMESTAMP DEFAULT NOW(),
                data_importacao TIMESTAMP DEFAULT NOW(),
                xml_hash VARCHAR(64)
            );
            CREATE INDEX idx_cargas_hash ON cargas(xml_hash);
        `);

        await client.query(`
            CREATE TABLE clientes (
                id UUID PRIMARY KEY,
                nome TEXT
            );
        `);

        await client.query(`
            CREATE TABLE produtos (
                id UUID PRIMARY KEY,
                referencia TEXT UNIQUE,
                descricao TEXT,
                ean TEXT
            );
        `);

        await client.query(`
            CREATE TABLE carga_itens (
                id UUID PRIMARY KEY,
                carga_id UUID REFERENCES cargas(id),
                cliente_id UUID REFERENCES clientes(id),
                produto_referencia TEXT,
                produto_nome TEXT,
                quantidade_esperada NUMERIC,
                unidade TEXT
            );
        `);

        await client.query(`
            CREATE TABLE volumes (
                id UUID PRIMARY KEY,
                carga_id UUID REFERENCES cargas(id),
                cliente_id UUID REFERENCES clientes(id),
                numero_sequencial INTEGER,
                is_open BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                closed_at TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE volume_itens (
                id UUID PRIMARY KEY,
                volume_id UUID REFERENCES volumes(id),
                produto_ean TEXT,
                produto_referencia TEXT,
                quantidade NUMERIC,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ All tables recreated successfully!');

    } catch (err) {
        console.error('❌ FATAL ERROR RECREATING TABLES:', err);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

recreate();
