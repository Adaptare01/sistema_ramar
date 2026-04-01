import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Delete items first
        await prisma.volumeItem.deleteMany({ where: { volumeId: id } });
        // Delete volume
        const result = await prisma.volume.delete({ where: { id } });
        if (!result) {
            return NextResponse.json({ error: 'Volume não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Volume excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir volume:', error);
        return NextResponse.json({ error: 'Falha ao excluir volume' }, { status: 500 });
    }
}
