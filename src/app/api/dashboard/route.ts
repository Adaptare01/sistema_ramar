import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const [totalCargas, volumesAtivos, recentCargas] = await Promise.all([
            prisma.carga.count(),
            prisma.volume.count({ where: { isOpen: true } }),
            prisma.carga.findMany({
                select: { nomeArquivo: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);

        // Calculate scanned vs expected
        const scannedAgg = await prisma.volumeItem.aggregate({ _sum: { quantidade: true } });
        const expectedAgg = await prisma.carga.aggregate({ _sum: { totalItens: true } });

        const totalScanned = Number(scannedAgg._sum.quantidade ?? 0);
        const totalExpected = Number(expectedAgg._sum.totalItens ?? 0);
        const progresso = totalExpected > 0 ? parseFloat(((totalScanned / totalExpected) * 100).toFixed(1)) : 0;

        return NextResponse.json({
            totalCargas,
            volumesAtivos,
            progresso,
            recentActivity: recentCargas.map((c) => ({
                nome_arquivo: c.nomeArquivo,
                status: c.status,
                created_at: c.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('Erro no dashboard:', error);
        return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
    }
}
