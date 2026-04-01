import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { cargaId, clienteId } = await req.json();

        const volumes = await prisma.volume.findMany({
            where: { cargaId, clienteId },
            orderBy: { createdAt: 'asc' },
        });

        for (let i = 0; i < volumes.length; i++) {
            await prisma.volume.update({
                where: { id: volumes[i].id },
                data: { numeroSequencial: i + 1 },
            });
        }

        return NextResponse.json({ success: true, message: 'Volumes renumerados com sucesso' });
    } catch (error) {
        console.error('Erro ao renumerar volumes:', error);
        return NextResponse.json({ error: 'Falha ao renumerar volumes' }, { status: 500 });
    }
}
