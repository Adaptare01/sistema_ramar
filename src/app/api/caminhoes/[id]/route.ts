import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { placa, modelo, condutor, ativo } = await req.json();

        const caminhao = await prisma.caminhao.update({
            where: { id },
            data: {
                ...(placa !== undefined && { placa: placa.trim().toUpperCase() }),
                ...(modelo !== undefined && { modelo: modelo?.trim() || null }),
                ...(condutor !== undefined && { condutor: condutor?.trim() || null }),
                ...(ativo !== undefined && { ativo }),
            },
        });

        return NextResponse.json({ success: true, caminhao });
    } catch (error) {
        console.error('Erro ao atualizar caminhão:', error);
        return NextResponse.json({ error: 'Erro ao atualizar caminhão' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Delete associated trips first
        await prisma.viagem.deleteMany({ where: { caminhaoId: id } });
        await prisma.caminhao.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir caminhão:', error);
        return NextResponse.json({ error: 'Erro ao excluir caminhão' }, { status: 500 });
    }
}
