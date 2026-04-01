import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
    try {
        const conferencias = await prisma.conferencia.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                carga: { select: { nomeArquivo: true } },
                cliente: { select: { nome: true } },
            },
        });

        return NextResponse.json(
            conferencias.map((conf) => ({
                ...conf,
                carga_nome: conf.carga.nomeArquivo,
                cliente_nome: conf.cliente.nome,
            }))
        );
    } catch (error) {
        console.error('Erro ao listar conferências:', error);
        return NextResponse.json({ error: 'Erro ao listar conferências' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { cargaId, clienteId, resumo, reportSnapshot } = await req.json();

        // Check if exists
        const existing = await prisma.conferencia.findFirst({
            where: { cargaId, clienteId },
        });

        if (existing) {
            await prisma.conferencia.update({
                where: { id: existing.id },
                data: {
                    resumo,
                    reportSnapshot,
                    status: 'FINALIZADA',
                    createdAt: new Date(),
                },
            });
            return NextResponse.json({ success: true, id: existing.id, message: 'Conferência atualizada' });
        }

        const id = randomUUID();
        await prisma.conferencia.create({
            data: {
                id,
                cargaId,
                clienteId,
                resumo,
                reportSnapshot,
                status: 'FINALIZADA',
            },
        });

        return NextResponse.json({ success: true, id, message: 'Conferência criada' });
    } catch (error) {
        console.error('Erro ao finalizar conferência:', error);
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ error: 'Erro ao finalizar conferência: ' + msg }, { status: 500 });
    }
}
