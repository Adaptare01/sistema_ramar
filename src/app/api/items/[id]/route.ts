import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { quantity } = await req.json();
    try {
        const result = await prisma.volumeItem.update({
            where: { id },
            data: { quantidade: quantity },
        });
        if (!result) {
            return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Quantidade atualizada' });
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        return NextResponse.json({ error: 'Falha ao atualizar item' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.volumeItem.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'Item removido' });
    } catch (error) {
        console.error('Erro ao remover item:', error);
        return NextResponse.json({ error: 'Falha ao remover item' }, { status: 500 });
    }
}
