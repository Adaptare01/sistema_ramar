import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Get distinct clients for this carga
        const cargaItens = await prisma.cargaItem.findMany({
            where: { cargaId: id },
            select: { clienteId: true },
            distinct: ['clienteId'],
        });

        const clientIds = cargaItens.map((i) => i.clienteId).filter(Boolean) as string[];

        const clients = await prisma.cliente.findMany({
            where: { id: { in: clientIds } },
            orderBy: { nome: 'asc' },
        });

        const clientsData = await Promise.all(
            clients.map(async (cli) => {
                // Items expected
                const items = await prisma.cargaItem.findMany({
                    where: { cargaId: id, clienteId: cli.id },
                    select: {
                        produtoReferencia: true,
                        produtoNome: true,
                        quantidadeEsperada: true,
                        unidade: true,
                    },
                });

                const totalItems = items.reduce((acc, i) => acc + Number(i.quantidadeEsperada ?? 0), 0);

                // Items scanned
                const scanned = await prisma.volumeItem.aggregate({
                    where: { volume: { cargaId: id, clienteId: cli.id } },
                    _sum: { quantidade: true },
                });
                const totalScanned = Number(scanned._sum.quantidade ?? 0);

                // Conference status
                const conf = await prisma.conferencia.findFirst({
                    where: { cargaId: id, clienteId: cli.id },
                    select: { id: true, resumo: true },
                });

                let reportId = null;
                let hasReservations = false;

                if (conf) {
                    reportId = conf.id;
                    const r = conf.resumo as Record<string, number> | null;
                    if (r && ((r.missing > 0) || (r.excess > 0) || (r.extra > 0))) {
                        hasReservations = true;
                    }
                }

                return {
                    id: cli.id,
                    name: cli.nome,
                    items: items.map((i) => ({
                        referencia: i.produtoReferencia,
                        nome: i.produtoNome,
                        quantidadeEsperada: Number(i.quantidadeEsperada ?? 0),
                        unidade: i.unidade,
                    })),
                    totalItems,
                    totalScanned,
                    isCompleted: totalScanned >= totalItems,
                    reportId,
                    hasReservations,
                };
            })
        );

        return NextResponse.json({ cargaId: id, clients: clientsData });
    } catch (error) {
        console.error('Erro ao buscar clientes da carga:', error);
        return NextResponse.json({ error: 'Erro ao buscar detalhes da carga' }, { status: 500 });
    }
}
