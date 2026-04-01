import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const vol = await prisma.volume.findUnique({ where: { id }, select: { cargaId: true, clienteId: true } });
        if (!vol) {
            return NextResponse.json({ error: 'Volume não encontrado' }, { status: 404 });
        }

        // Check if another volume is already open
        const openCheck = await prisma.volume.findFirst({
            where: { cargaId: vol.cargaId!, clienteId: vol.clienteId!, isOpen: true, NOT: { id } },
        });

        if (openCheck) {
            return NextResponse.json(
                { error: 'Já existe um volume aberto. Feche-o antes de reabrir outro.' },
                { status: 400 }
            );
        }

        await prisma.volume.update({
            where: { id },
            data: { isOpen: true, closedAt: null },
        });

        return NextResponse.json({ success: true, message: 'Volume reaberto com sucesso' });
    } catch (error) {
        console.error('Erro ao reabrir volume:', error);
        return NextResponse.json({ error: 'Falha ao reabrir volume' }, { status: 500 });
    }
}
