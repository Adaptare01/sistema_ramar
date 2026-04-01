import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
    try {
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

        // Upsert conferencia as EM_ANDAMENTO (tracks start time)
        const existingConf = await prisma.conferencia.findFirst({
            where: { cargaId, clienteId },
        });
        if (!existingConf) {
            await prisma.conferencia.create({
                data: {
                    id: randomUUID(),
                    cargaId,
                    clienteId,
                    status: 'EM_ANDAMENTO',
                },
            });
        } else if (existingConf.status === 'FINALIZADA') {
            // Re-opening a finalized conference
            await prisma.conferencia.update({
                where: { id: existingConf.id },
                data: { status: 'EM_ANDAMENTO', finalizadoEm: null, resumo: Prisma.JsonNull, reportSnapshot: Prisma.JsonNull },
            });
        }

        return NextResponse.json({ success: true, volumeId, sequencial: nextSeq });
    } catch (error) {
        console.error('Erro ao criar volume:', error);
        return NextResponse.json({ error: 'Falha ao criar volume' }, { status: 500 });
    }
}
