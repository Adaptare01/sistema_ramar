
import { getClient } from './server/db.js';
import fs from 'fs';
import { randomUUID } from 'crypto';

async function restore() {
    let client;
    try {
        if (!fs.existsSync('backup_orders.json')) {
            console.error('❌ Arquivo backup_orders.json não encontrado!');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync('backup_orders.json', 'utf8'));
        client = await getClient();
        console.log('♻️ Restaurando dados do backup...');

        await client.query('BEGIN');

        // 0. Pre-restaurar Produtos (para garantir FKs)
        console.log('Ensuring referenced products exist...');
        const uniqueProducts = new Map();

        // Coletar produtos de Carga Itens
        if (data.itens) {
            for (const item of data.itens) {
                if (item.produto_referencia && !uniqueProducts.has(item.produto_referencia)) {
                    uniqueProducts.set(item.produto_referencia, {
                        referencia: item.produto_referencia,
                        descricao: item.produto_nome || 'Produto Restaurado',
                        ean: '' // Não temos EAN aqui garantido
                    });
                }
            }
        }

        // Coletar produtos de Volume Itens (pode ter EAN)
        if (data.volItens) {
            for (const vi of data.volItens) {
                if (vi.produto_referencia) {
                    const existing = uniqueProducts.get(vi.produto_referencia);
                    if (existing) {
                        if (vi.produto_ean && !existing.ean) existing.ean = vi.produto_ean;
                    } else {
                        uniqueProducts.set(vi.produto_referencia, {
                            referencia: vi.produto_referencia,
                            descricao: 'Produto Restaurado',
                            ean: vi.produto_ean || ''
                        });
                    }
                }
            }
        }

        console.log(`Found ${uniqueProducts.size} unique referenced products.`);

        // Inserir Produtos faltantes
        for (const prod of uniqueProducts.values()) {
            await client.query(
                `INSERT INTO produtos (id, referencia, descricao, ean) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (referencia) DO NOTHING`,
                [randomUUID(), prod.referencia, prod.descricao, prod.ean]
            );
        }

        // 1. Restaurar Clientes
        console.log(`Restoring ${data.clientes.length} clients...`);
        for (const cli of data.clientes) {
            await client.query(
                `INSERT INTO clientes (id, nome) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
                [cli.id, cli.nome]
            );
        }

        // 2. Restaurar Cargas
        console.log(`Restoring ${data.cargas.length} loads...`);
        for (const carga of data.cargas) {
            await client.query(
                `INSERT INTO cargas (id, nome_arquivo, status, total_itens, created_at, data_importacao, xml_hash) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [carga.id, carga.nome_arquivo, carga.status, carga.total_itens, carga.created_at, carga.data_importacao, carga.xml_hash]
            );
        }

        // 3. Restaurar Itens da Carga
        console.log(`Restoring ${data.itens.length} items...`);
        for (const item of data.itens) {
            await client.query(
                `INSERT INTO carga_itens (id, carga_id, cliente_id, produto_referencia, produto_nome, quantidade_esperada, unidade)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [item.id, item.carga_id, item.cliente_id, item.produto_referencia, item.produto_nome, item.quantidade_esperada, item.unidade]
            );
        }

        // 4. Restaurar Volumes
        console.log(`Restoring ${data.volumes.length} volumes...`);
        for (const vol of data.volumes) {
            await client.query(
                `INSERT INTO volumes (id, carga_id, cliente_id, numero_sequencial, is_open, created_at, closed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [vol.id, vol.carga_id, vol.cliente_id, vol.numero_sequencial, vol.is_open, vol.created_at, vol.closed_at]
            );
        }

        // 5. Restaurar Itens dos Volumes
        console.log(`Restoring ${data.volItens.length} volume items...`);
        for (const vi of data.volItens) {
            await client.query(
                `INSERT INTO volume_itens (id, volume_id, produto_ean, produto_referencia, quantidade, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [vi.id, vi.volume_id, vi.produto_ean, vi.produto_referencia, vi.quantidade, vi.created_at]
            );
        }

        await client.query('COMMIT');
        console.log('✅ Restauração concluída com sucesso!');

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Erro na restauração:', err);
        fs.writeFileSync('restore_error.log', `Error: ${err.message}\nStack: ${err.stack}\n`);
    } finally {
        if (client) client.release();
        process.exit(0);
    }
}

restore();
