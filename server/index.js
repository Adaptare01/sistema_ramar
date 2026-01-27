import express from 'express';
import cors from 'cors';
import { query, getClient } from './db.js';

const app = express();
const port = 3001;


app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

import { randomUUID, createHash } from 'crypto';
import { parseCrystalReportsXML } from './xmlParserNode.js';

// Rota de Importação de XML
app.post('/api/import', async (req, res) => {
    const { xmlContent, fileName } = req.body;
    let client;

    if (!xmlContent) {
        return res.status(400).json({ error: 'Conteúdo XML é obrigatório' });
    }

    try {
        client = await getClient();

        // 1. Compute Hash of the Content
        const hash = createHash('md5').update(xmlContent).digest('hex');
        console.log(`[IMPORT] XML Hash calculated: ${hash}`);

        // 2. Parse Data
        const clientsData = parseCrystalReportsXML(xmlContent);
        const totalItens = clientsData.reduce((acc, c) => acc + c.totalItems, 0);

        // 3. Check for Duplicate Hash (DISABLED DUE TO DB PERMISSION ISSUE)
        // const duplicateCheck = await query('SELECT id FROM cargas WHERE xml_hash = $1 LIMIT 1', [hash]);
        // ... (Logic removed/commented)

        await client.query('BEGIN');

        // 4. Create Carga (WITHOUT HASH)
        const cargaId = randomUUID();
        await client.query(
            `INSERT INTO cargas (id, nome_arquivo, status, total_itens) 
       VALUES ($1, $2, $3, $4)`,
            [cargaId, fileName || 'Importação Manual', 'ABERTO', totalItens]
        );

        for (const cli of clientsData) {
            // 2. Upsert Cliente
            await client.query(
                `INSERT INTO clientes (id, nome) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome`,
                [cli.id, cli.name]
            );

            for (const item of cli.items) {
                // 3. Upsert Produto
                const prodId = randomUUID();
                await client.query(
                    `INSERT INTO produtos (id, referencia, descricao, ean)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (referencia) DO NOTHING`,
                    [prodId, item.referencia, item.nome, '']
                );

                // 4. Inserir Item da Carga
                const itemId = randomUUID();
                await client.query(
                    `INSERT INTO carga_itens (id, carga_id, cliente_id, produto_referencia, quantidade_esperada, produto_nome, unidade)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [itemId, cargaId, cli.id, item.referencia, item.quantidadeEsperada, item.nome, item.unidade]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Importação concluída com sucesso',
            data: {
                cargaId,
                totalClientes: clientsData.length,
                totalItens,
                clients: clientsData
            }
        });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Erro na importação:', err);
        res.status(500).json({
            status: 'error',
            message: 'Falha ao processar importação',
            error: err.message
        });
    } finally {
        if (client) client.release();
    }
});

// Rota de teste
app.get('/api/test', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({
            status: 'ok',
            message: 'Conexão com banco de dados estabelecida com sucesso!',
            timestamp: result.rows[0].now
        });
    } catch (err) {
        console.error('Erro ao conectar no banco:', err);
        res.status(500).json({
            status: 'error',
            message: 'Falha na conexão com o banco de dados',
            error: err.message
        });
    }
});

// Rota de Dashboard
app.get('/api/dashboard', async (req, res) => {
    let client;
    try {
        client = await getClient();
        // Executar queries em paralelo para performance
        const [cargasRes, volumesRes, scannedRes, expectedRes, recentRes] = await Promise.all([
            client.query('SELECT COUNT(*) FROM cargas'),
            client.query('SELECT COUNT(*) FROM volumes WHERE is_open = true'),
            client.query('SELECT COALESCE(SUM(quantidade), 0) as total FROM volume_itens'),
            client.query('SELECT COALESCE(SUM(total_itens), 0) as total FROM cargas'),
            client.query('SELECT nome_arquivo, status, created_at FROM cargas ORDER BY created_at DESC LIMIT 5')
        ]);

        const totalEsperado = parseInt(expectedRes.rows[0].total);
        const totalConferido = parseInt(scannedRes.rows[0].total);
        const percentage = totalEsperado > 0 ? (totalConferido / totalEsperado) * 100 : 0;

        res.json({
            totalCargas: parseInt(cargasRes.rows[0].count),
            volumesAtivos: parseInt(volumesRes.rows[0].count),
            progresso: parseFloat(percentage.toFixed(1)),
            recentActivity: recentRes.rows
        });
    } catch (err) {
        console.error('Erro no dashboard:', err);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    } finally {
        if (client) client.release();
    }
});

// --- ROTAS DE CARGAS ---

// Listar todas as cargas
app.get('/api/cargas', async (req, res) => {
    console.log('[API] Request received: GET /api/cargas');
    try {
        const result = await query(
            `SELECT id, nome_arquivo, status, total_itens, data_importacao,
            (SELECT COUNT(*) FROM volumes WHERE carga_id = cargas.id) as volumes_count,
            (SELECT COALESCE(SUM(quantidade), 0) FROM volume_itens 
             JOIN volumes ON volumes.id = volume_itens.volume_id 
             WHERE volumes.carga_id = cargas.id) as items_scanned
             FROM cargas ORDER BY data_importacao DESC`
        );
        console.log(`[API] GET /api/cargas success. Found ${result.rows.length} rows.`);
        res.json(result.rows);
    } catch (err) {
        console.error('[API] Erro ao listar cargas:', err);
        res.status(500).json({ error: 'Erro ao listar cargas', details: err.message });
    }
});

// Listar Clientes de uma Carga Específica
app.get('/api/cargas/:id/clients', async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        client = await getClient();

        // 1. Buscar dados dos clientes vinculados a esta carga
        // Como o relacionamento original era via carga_itens, vamos agregar por lá
        const clientsRes = await client.query(
            `SELECT DISTINCT c.id, c.nome
             FROM clientes c
             JOIN carga_itens ci ON ci.cliente_id = c.id
             WHERE ci.carga_id = $1
             ORDER BY c.nome`,
            [id]
        );

        // 2. Para cada cliente, montar a estrutura de itens esperados
        // Isso é pesado, ideal seria otimizar, mas para MVP ok.
        const clientsData = [];

        for (const cli of clientsRes.rows) {
            const itemsRes = await client.query(
                `SELECT produto_referencia as referencia, produto_nome as nome, quantidade_esperada as "quantidadeEsperada", unidade
                  FROM carga_itens
                  WHERE carga_id = $1 AND cliente_id = $2`,
                [id, cli.id]
            );

            // Calcular total de itens
            const totalItems = itemsRes.rows.reduce((acc, i) => acc + i.quantidadeEsperada, 0);

            clientsData.push({
                id: cli.id,
                name: cli.nome,
                items: itemsRes.rows,
                totalItems
            });
        }

        // Retornar estrutura compatível com o que o Frontend espera (igual ao importXML)
        res.json({
            cargaId: id,
            clients: clientsData
        });

    } catch (err) {
        console.error('Erro ao buscar clientes da carga:', err);
        res.status(500).json({ error: 'Erro ao buscar detalhes da carga' });
    } finally {
        if (client) client.release();
    }
});

// --- NOVAS ROTAS DE CONFERÊNCIA ---

// Criar novo volume
app.post('/api/volumes', async (req, res) => {
    const { cargaId, clienteId } = req.body;
    let client;
    try {
        client = await getClient();
        // Verificar se já existe volume aberto para este cliente
        const openCheck = await query(
            'SELECT id FROM volumes WHERE carga_id = $1 AND cliente_id = $2 AND is_open = true',
            [cargaId, clienteId]
        );

        if (openCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe um volume aberto para este cliente.' });
        }

        // Pegar próximo sequencial
        const seqRes = await query(
            'SELECT COALESCE(MAX(numero_sequencial), 0) + 1 as next_seq FROM volumes WHERE carga_id = $1 AND cliente_id = $2',
            [cargaId, clienteId]
        );
        const nextSeq = seqRes.rows[0].next_seq;

        const volumeId = randomUUID();
        await query(
            'INSERT INTO volumes (id, carga_id, cliente_id, numero_sequencial, is_open) VALUES ($1, $2, $3, $4, true)',
            [volumeId, cargaId, clienteId, nextSeq]
        );

        res.json({ success: true, volumeId, sequencial: nextSeq });

    } catch (err) {
        console.error('Erro ao criar volume:', err);
        res.status(500).json({ error: 'Falha ao criar volume' });
    } finally {
        if (client) client.release();
    }
});

// Fechar volume
// Fechar volume
app.post('/api/volumes/:id/close', async (req, res) => {
    const { id } = req.params;
    try {
        await query('UPDATE volumes SET is_open = false, closed_at = NOW() WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao fechar volume:', err);
        res.status(500).json({ error: 'Falha ao fechar volume' });
    }
});

// Reabrir volume
app.post('/api/volumes/:id/reopen', async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        client = await getClient();
        await client.query('BEGIN');

        // 1. Get volume details
        const volRes = await client.query('SELECT carga_id, cliente_id FROM volumes WHERE id = $1', [id]);
        if (volRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Volume não encontrado' });
        }
        const { carga_id, cliente_id } = volRes.rows[0];

        // 2. Check if any other volume is open for this client
        const openCheck = await client.query(
            'SELECT id FROM volumes WHERE carga_id = $1 AND cliente_id = $2 AND is_open = true AND id != $3',
            [carga_id, cliente_id, id]
        );

        if (openCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Já existe um volume aberto. Feche-o antes de reabrir outro.' });
        }

        // 3. Reopen volume
        await client.query('UPDATE volumes SET is_open = true, closed_at = NULL WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Volume reaberto com sucesso' });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Erro ao reabrir volume:', err);
        res.status(500).json({ error: 'Falha ao reabrir volume' });
    } finally {
        if (client) client.release();
    }
});

// Bipar Item (Scan)
app.post('/api/scan', async (req, res) => {
    const { volumeId, barcode, quantity = 1 } = req.body;
    let client;
    try {
        client = await getClient();
        await client.query('BEGIN');

        // 1. Identificar Produto pelo EAN
        const prodRes = await client.query('SELECT * FROM produtos WHERE ean = $1', [barcode]);

        if (prodRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Produto não encontrado', code: 'PROD_NOT_FOUND' });
        }

        const produto = prodRes.rows[0];

        // 2. Verificar Volume
        const volRes = await client.query('SELECT cliente_id, carga_id FROM volumes WHERE id = $1', [volumeId]);
        if (volRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Volume não encontrado' });
        }
        const { cliente_id, carga_id } = volRes.rows[0];

        // 3. Verificar na carga_itens (Expectativa)
        const itemRes = await client.query(
            'SELECT * FROM carga_itens WHERE carga_id = $1 AND cliente_id = $2 AND produto_referencia = $3',
            [carga_id, cliente_id, produto.referencia]
        );

        let isExtra = false;
        let warning = null;

        if (itemRes.rows.length === 0) {
            isExtra = true;
            console.warn(`Item fora do pedido: ${produto.referencia}`);
        } else {
            // Verificar Quantidade Excedente
            const expectedQty = itemRes.rows[0].quantidade_esperada;

            // Buscar quanto JÁ FOI bipado em TODOS os volumes deste cliente
            const scannedRes = await client.query(
                `SELECT COALESCE(SUM(vi.quantidade), 0) as total_scanned
                 FROM volume_itens vi
                 JOIN volumes v ON vi.volume_id = v.id
                 WHERE v.carga_id = $1 AND v.cliente_id = $2 AND vi.produto_referencia = $3`,
                [carga_id, cliente_id, produto.referencia]
            );

            const currentTotal = parseFloat(scannedRes.rows[0].total_scanned);
            const newTotal = currentTotal + parseFloat(quantity);

            if (newTotal > expectedQty) {
                warning = {
                    type: 'EXCESS_QUANTITY',
                    message: `ATENÇÃO: Produto ${produto.referencia} (${produto.descricao || produto.nome}) - Quantidade maior que o pedido (${expectedQty}).`,
                    expected: expectedQty,
                    current: currentTotal,
                    attempted: newTotal
                };
            }
        }

        // 4. Inserir no volume_itens
        const itemId = randomUUID();
        await client.query(
            `INSERT INTO volume_itens (id, volume_id, produto_ean, produto_referencia, quantidade)
             VALUES ($1, $2, $3, $4, $5)`,
            [itemId, volumeId, barcode, produto.referencia, quantity]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            item: {
                id: itemId,
                referencia: produto.referencia,
                nome: produto.nome,
                ean: produto.ean,
                quantidade: quantity
            },
            product: produto,
            isExtra,
            warning
        });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Erro no scan:', err);
        res.status(500).json({ error: 'Falha ao processar bipagem' });
    } finally {
        if (client) client.release();
    }
});

// Remover item do volume
app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Request to remove item ID: ${id}`);
    try {
        const result = await query('DELETE FROM volume_itens WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json({ success: true, message: 'Item removido' });
    } catch (err) {
        console.error('Erro ao remover item:', err);
        res.status(500).json({ error: 'Falha ao remover item' });
    }
});

// Atualizar quantidade do item
app.put('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    console.log(`[UPDATE] Request to update item ID: ${id} to Qty: ${quantity}`);
    try {
        const result = await query('UPDATE volume_itens SET quantidade = $1 WHERE id = $2 RETURNING *', [quantity, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json({ success: true, message: 'Quantidade atualizada' });
    } catch (err) {
        console.error('Erro ao atualizar item:', err);
        res.status(500).json({ error: 'Falha ao atualizar item' });
    }
});

// Buscar volumes de um cliente
app.get('/api/clients/:id/volumes', async (req, res) => {
    const { id } = req.params;
    const { cargaId } = req.query;

    try {
        const result = await query(
            `SELECT v.*, 
                    (SELECT COUNT(*) FROM volume_itens vi WHERE vi.volume_id = v.id) as item_count,
                    (SELECT json_agg(vi) FROM volume_itens vi WHERE vi.volume_id = v.id) as items
             FROM volumes v 
             WHERE v.cliente_id = $1 AND v.carga_id = $2
             ORDER BY v.numero_sequencial`,
            [id, cargaId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar volumes:', err);
        res.status(500).json({ error: 'Erro ao buscar volumes' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        error: err.message
    });
});

// Inicialização do servidor
app.listen(port, () => {
    console.log(`🚀 Servidor backend rodando em http://localhost:${port}`);
});
