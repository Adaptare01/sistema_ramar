import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.volume.update({
            where: { id },
            data: { isOpen: false, closedAt: new Date() },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao fechar volume:', error);
        return NextResponse.json({ error: 'Falha ao fechar volume' }, { status: 500 });
    }
}
