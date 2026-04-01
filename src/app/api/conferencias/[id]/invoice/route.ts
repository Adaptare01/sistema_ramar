import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { faturado } = await req.json();

    try {
        const result = await prisma.conferencia.update({
            where: { id },
            data: { faturado },
        });

        return NextResponse.json({ success: true, faturado: result.faturado });
    } catch (error) {
        console.error('Erro ao atualizar faturamento:', error);
        return NextResponse.json({ error: 'Erro ao atualizar status de faturamento' }, { status: 500 });
    }
}
