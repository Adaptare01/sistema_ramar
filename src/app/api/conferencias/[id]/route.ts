import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const conf = await prisma.conferencia.findUnique({
            where: { id },
            include: {
                carga: { select: { nomeArquivo: true } },
                cliente: { select: { nome: true } },
            },
        });

        if (!conf) {
            return NextResponse.json({ error: 'Conferência não encontrada' }, { status: 404 });
        }

        return NextResponse.json({
            ...conf,
            carga_nome: conf.carga.nomeArquivo,
            cliente_nome: conf.cliente.nome,
        });
    } catch (error) {
        console.error('Erro ao obter conferência:', error);
        return NextResponse.json({ error: 'Erro ao obter conferência' }, { status: 500 });
    }
}
