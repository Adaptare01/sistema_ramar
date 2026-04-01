import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID, createHash } from 'crypto';
import { parseCrystalReportsXML } from '@/lib/xmlParser';

export async function POST(req: NextRequest) {
    try {
        const { xmlContent, fileName } = await req.json();

        if (!xmlContent) {
            return NextResponse.json({ error: 'Conteúdo XML é obrigatório' }, { status: 400 });
        }

        const hash = createHash('md5').update(xmlContent).digest('hex');

        // Check duplicate
        const existing = await prisma.carga.findFirst({ where: { nomeArquivo: fileName } });
        if (existing) {
            return NextResponse.json(
                { error: `O arquivo '${fileName}' já foi importado anteriormente.` },
                { status: 409 }
            );
        }

        // Parse XML
        const clientsData = parseCrystalReportsXML(xmlContent);
        const totalItens = clientsData.reduce((acc: number, c) => acc + c.totalItems, 0);

        // Create carga
        const cargaId = randomUUID();
        await prisma.carga.create({
            data: {
                id: cargaId,
                nomeArquivo: fileName || 'Importação Manual',
                status: 'ABERTO',
                totalItens,
                xmlHash: hash,
            },
        });

        // Create clients and items
        for (const cli of clientsData) {
            await prisma.cliente.upsert({
                where: { id: cli.id },
                update: { nome: cli.name },
                create: { id: cli.id, nome: cli.name },
            });

            for (const item of cli.items) {
                // Upsert product
                const existingProd = await prisma.produto.findUnique({ where: { referencia: item.referencia } });
                if (!existingProd) {
                    await prisma.produto.create({
                        data: {
                            id: randomUUID(),
                            referencia: item.referencia,
                            descricao: item.nome,
                            ean: '',
                        },
                    });
                }

                // Create carga item
                await prisma.cargaItem.create({
                    data: {
                        id: randomUUID(),
                        cargaId,
                        clienteId: cli.id,
                        produtoReferencia: item.referencia,
                        produtoNome: item.nome,
                        quantidadeEsperada: item.quantidadeEsperada,
                        unidade: item.unidade,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Importação concluída com sucesso',
            data: { cargaId, totalClientes: clientsData.length, totalItens, clients: clientsData },
        });
    } catch (error) {
        console.error('Erro na importação:', error);
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ error: 'Falha ao processar importação: ' + msg }, { status: 500 });
    }
}
