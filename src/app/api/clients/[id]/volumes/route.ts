import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const cargaId = req.nextUrl.searchParams.get('cargaId');

    if (!cargaId) {
        return NextResponse.json({ error: 'cargaId é obrigatório' }, { status: 400 });
    }

    try {
        const volumes = await prisma.volume.findMany({
            where: { clienteId: id, cargaId },
            orderBy: { numeroSequencial: 'asc' },
            include: {
                itens: true,
            },
        });

        return NextResponse.json(
            volumes.map((v) => ({
                ...v,
                is_open: v.isOpen,
                numero_sequencial: v.numeroSequencial,
                item_count: v.itens.length,
                items: v.itens.map((i) => ({
                    ...i,
                    produto_ean: i.produtoEan,
                    produto_referencia: i.produtoReferencia,
                    created_at: i.createdAt,
                })),
            }))
        );
    } catch (error) {
        console.error('Erro ao buscar volumes:', error);
        return NextResponse.json({ error: 'Erro ao buscar volumes' }, { status: 500 });
    }
}
