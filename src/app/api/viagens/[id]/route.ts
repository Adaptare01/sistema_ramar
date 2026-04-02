import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { kmChegada } = await req.json();
        const viagem = await prisma.viagem.update({
            where: { id },
            data: { kmChegada },
        });
        return NextResponse.json({ success: true, viagem });
    } catch (error) {
        console.error('Erro ao atualizar viagem:', error);
        return NextResponse.json({ error: 'Erro ao atualizar viagem' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.viagem.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir viagem:', error);
        return NextResponse.json({ error: 'Erro ao excluir viagem' }, { status: 500 });
    }
}
