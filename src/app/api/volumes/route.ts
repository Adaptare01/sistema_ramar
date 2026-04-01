import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { cargaId, clienteId } = await req.json();

        // Check if there's already an open volume
        const openVol = await prisma.volume.findFirst({
            where: { cargaId, clienteId, isOpen: true },
        });

        if (openVol) {
            return NextResponse.json(
                { error: 'Já existe um volume aberto para este cliente.' },
                { status: 400 }
            );
        }

        // Check lock: if EM_ANDAMENTO conference exists with a different operator
        const existingConf = await prisma.conferencia.findFirst({
            where: { cargaId, clienteId },
        });

        const confAny = existingConf as Record<string, unknown> | null;
        if (existingConf && existingConf.status === 'EM_ANDAMENTO' && confAny?.operadorId && confAny.operadorId !== session.userId) {
            return NextResponse.json(
                { error: `Esta conferência está sendo realizada pelo operador ${confAny.operadorNome || 'outro usuário'}. Aguarde a conclusão.`, locked: true, operador: confAny.operadorNome },
                { status: 423 }
            );
        }

        // Get next sequential number
        const maxVol = await prisma.volume.aggregate({
            where: { cargaId, clienteId },
            _max: { numeroSequencial: true },
        });
        const nextSeq = (maxVol._max.numeroSequencial ?? 0) + 1;

        const volumeId = randomUUID();
        await prisma.volume.create({
            data: {
                id: volumeId,
                cargaId,
                clienteId,
                numeroSequencial: nextSeq,
                isOpen: true,
            },
        });

        // Upsert conferencia as EM_ANDAMENTO with operator info
        if (!existingConf) {
            await prisma.conferencia.create({
                data: {
                    id: randomUUID(),
                    cargaId,
                    clienteId,
                    status: 'EM_ANDAMENTO',
                    operadorId: session.userId,
                    operadorNome: session.nome,
                },
            });
        } else if (existingConf.status === 'FINALIZADA') {
            // Re-opening a finalized conference
            await prisma.conferencia.update({
                where: { id: existingConf.id },
                data: {
                    status: 'EM_ANDAMENTO',
                    finalizadoEm: null,
                    resumo: Prisma.JsonNull,
                    reportSnapshot: Prisma.JsonNull,
                    operadorId: session.userId,
                    operadorNome: session.nome,
                },
            });
        } else if (existingConf.status === 'EM_ANDAMENTO' && !confAny?.operadorId) {
            // Existing EM_ANDAMENTO without operator — fill in
            await prisma.conferencia.update({
                where: { id: existingConf.id },
                data: {
                    operadorId: session.userId,
                    operadorNome: session.nome,
                },
            });
        }

        return NextResponse.json({ success: true, volumeId, sequencial: nextSeq });
    } catch (error) {
        console.error('Erro ao criar volume:', error);
        return NextResponse.json({ error: 'Falha ao criar volume' }, { status: 500 });
    }
}
