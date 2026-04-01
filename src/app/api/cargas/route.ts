import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const cargas = await prisma.carga.findMany({
            orderBy: { dataImportacao: 'desc' },
            include: {
                _count: { select: { volumes: true } },
            },
        });

        // For each carga, get scanned items count
        const result = await Promise.all(
            cargas.map(async (carga) => {
                const scanned = await prisma.volumeItem.aggregate({
                    where: { volume: { cargaId: carga.id } },
                    _sum: { quantidade: true },
                });
                return {
                    id: carga.id,
                    nome_arquivo: carga.nomeArquivo,
                    status: carga.status,
                    total_itens: Number(carga.totalItens ?? 0),
                    data_importacao: carga.dataImportacao?.toISOString(),
                    volumes_count: carga._count.volumes,
                    items_scanned: Number(scanned._sum.quantidade ?? 0),
                };
            })
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Erro ao listar cargas:', error);
        return NextResponse.json({ error: 'Erro ao listar cargas' }, { status: 500 });
    }
}
