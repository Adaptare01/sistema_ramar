import { getClient } from './server/db.js';
import fs from 'fs';

async function run() {
    const client = await getClient();
    const artifactPath = 'C:\\Users\\m_our\\.gemini\\antigravity\\brain\\5a9b4099-dd6c-427a-8668-d7707cba4b03\\amarildo_items.md';
    let output = '# Relatório de Itens - Carga Amarildo\n\n';

    try {
        // Find carga
        const resCarga = await client.query("SELECT * FROM cargas WHERE nome_arquivo ILIKE '%amarildo%'");
        if (resCarga.rows.length === 0) {
            console.log("❌ Carga 'amarildo' não encontrada.");
            return;
        }
        const carga = resCarga.rows[0];
        output += `📦 **Carga:** ${carga.nome_arquivo} (ID: ${carga.id})\n\n`;

        // Get distinct clients in this carga
        const resClientes = await client.query(`
            SELECT DISTINCT ci.cliente_id, c.nome 
            FROM carga_itens ci
            LEFT JOIN clientes c ON ci.cliente_id = c.id
            WHERE ci.carga_id = $1
            ORDER BY c.nome
        `, [carga.id]);

        output += `👥 **Clientes Encontrados:** ${resClientes.rows.length}\n\n---\n\n`;

        for (const cli of resClientes.rows) {
            const nomeCliente = cli.nome || 'Nome Desconhecido';
            output += `### 👤 ${nomeCliente} (ID: ${cli.cliente_id})\n`;

            const resItens = await client.query(`
                SELECT produto_referencia, produto_nome, quantidade_esperada
                FROM carga_itens
                WHERE carga_id = $1 AND cliente_id = $2
                LIMIT 5
            `, [carga.id, cli.cliente_id]);

            resItens.rows.forEach(item => {
                output += `- **Ref:** \`${item.produto_referencia}\` | **Produto:** ${item.produto_nome} | **Qtd:** ${item.quantidade_esperada}\n`;
            });
            output += '\n';
        }

        fs.writeFileSync(artifactPath, output, 'utf8');
        console.log(`✅ Relatório gerado em: ${artifactPath}`);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
