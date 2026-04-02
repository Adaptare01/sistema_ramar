import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const mes = searchParams.get('mes');
        const ano = searchParams.get('ano');

        // Build date filter
        let dateFrom: Date | null = null;
        let dateTo: Date | null = null;

        if (ano && mes) {
            const y = parseInt(ano);
            const m = parseInt(mes) - 1; // JS months are 0-based
            dateFrom = new Date(y, m, 1);
            dateTo = new Date(y, m + 1, 1);
        } else if (ano) {
            const y = parseInt(ano);
            dateFrom = new Date(y, 0, 1);
            dateTo = new Date(y + 1, 0, 1);
        }

        const cargaDateFilter = dateFrom && dateTo
            ? { createdAt: { gte: dateFrom, lt: dateTo } }
            : {};

        const confDateFilter = dateFrom && dateTo
            ? { createdAt: { gte: dateFrom, lt: dateTo } }
            : {};

        // 1. Cargas Importadas
        const totalCargas = await prisma.carga.count({ where: cargaDateFilter });

        // 2. Clientes Totais (distinct clients in carga_itens of filtered cargas)
        let clientesTotais: number;
        if (dateFrom && dateTo) {
            const cargaIds = await prisma.carga.findMany({
                where: cargaDateFilter,
                select: { id: true },
            });
            const ids = cargaIds.map(c => c.id);
            if (ids.length > 0) {
                const distinctClients = await prisma.cargaItem.findMany({
                    where: { cargaId: { in: ids } },
                    distinct: ['clienteId'],
                    select: { clienteId: true },
                });
                clientesTotais = distinctClients.filter(c => c.clienteId).length;
            } else {
                clientesTotais = 0;
            }
        } else {
            const distinctClients = await prisma.cargaItem.findMany({
                distinct: ['clienteId'],
                select: { clienteId: true },
            });
            clientesTotais = distinctClients.filter(c => c.clienteId).length;
        }

        // 3. Clientes Em Separação (EM_ANDAMENTO)
        const emSeparacao = await prisma.conferencia.count({
            where: { ...confDateFilter, status: 'EM_ANDAMENTO' },
        });

        // 4. Clientes Finalizados
        const finalizados = await prisma.conferencia.count({
            where: { ...confDateFilter, status: 'FINALIZADA' },
        });

        // 5. Finalizados com Ressalva — need to check resumo JSON
        const finalizadasAll = await prisma.conferencia.findMany({
            where: { ...confDateFilter, status: 'FINALIZADA' },
            select: { resumo: true },
        });
        const comRessalva = finalizadasAll.filter(c => {
            const r = c.resumo as Record<string, number> | null;
            return r && (r.missing > 0 || r.excess > 0 || r.extra > 0);
        }).length;

        // 6. Clientes Faturados
        const faturados = await prisma.conferencia.count({
            where: { ...confDateFilter, faturado: true },
        });

        // 7. Tempo médio de conferência (created_at → finalizado_em)
        let tempoMedioConferencia: number | null = null;
        try {
            let avgQuery: { avg_minutes: number | null }[];
            if (dateFrom && dateTo) {
                avgQuery = await prisma.$queryRawUnsafe<{ avg_minutes: number | null }[]>(
                    `SELECT AVG(EXTRACT(EPOCH FROM (finalizado_em - created_at)) / 60) as avg_minutes
                     FROM conferencias
                     WHERE finalizado_em IS NOT NULL
                     AND created_at >= $1 AND created_at < $2`,
                    dateFrom, dateTo
                );
            } else {
                avgQuery = await prisma.$queryRawUnsafe<{ avg_minutes: number | null }[]>(
                    `SELECT AVG(EXTRACT(EPOCH FROM (finalizado_em - created_at)) / 60) as avg_minutes
                     FROM conferencias
                     WHERE finalizado_em IS NOT NULL`
                );
            }
            tempoMedioConferencia = avgQuery[0]?.avg_minutes ? Math.round(Number(avgQuery[0].avg_minutes)) : null;
        } catch (e) {
            console.error('Erro ao calcular tempo médio conferência:', e);
        }

        // 8. Tempo médio entre fechamento e faturamento (finalizado_em → faturado_em)
        let tempoMedioFaturamento: number | null = null;
        try {
            let avgQuery2: { avg_minutes: number | null }[];
            if (dateFrom && dateTo) {
                avgQuery2 = await prisma.$queryRawUnsafe<{ avg_minutes: number | null }[]>(
                    `SELECT AVG(EXTRACT(EPOCH FROM (faturado_em - finalizado_em)) / 60) as avg_minutes
                     FROM conferencias
                     WHERE finalizado_em IS NOT NULL AND faturado_em IS NOT NULL
                     AND created_at >= $1 AND created_at < $2`,
                    dateFrom, dateTo
                );
            } else {
                avgQuery2 = await prisma.$queryRawUnsafe<{ avg_minutes: number | null }[]>(
                    `SELECT AVG(EXTRACT(EPOCH FROM (faturado_em - finalizado_em)) / 60) as avg_minutes
                     FROM conferencias
                     WHERE finalizado_em IS NOT NULL AND faturado_em IS NOT NULL`
                );
            }
            tempoMedioFaturamento = avgQuery2[0]?.avg_minutes ? Math.round(Number(avgQuery2[0].avg_minutes)) : null;
        } catch (e) {
            console.error('Erro ao calcular tempo médio faturamento:', e);
        }

        return NextResponse.json({
            totalCargas,
            clientesTotais,
            emSeparacao,
            finalizados,
            comRessalva,
            faturados,
            tempoMedioConferencia,
            tempoMedioFaturamento,
        });
    } catch (error) {
        console.error('Erro no dashboard:', error);
        return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
    }
}
