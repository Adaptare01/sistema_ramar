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

        // Batch-load product names for all items
        const allRefs = [...new Set(
            volumes.flatMap(v => v.itens.map(i => i.produtoReferencia)).filter(Boolean)
        )] as string[];

        const produtos = allRefs.length > 0
            ? await prisma.produto.findMany({
                where: { referencia: { in: allRefs } },
                select: { referencia: true, descricao: true, nome: true },
            })
            : [];

        const produtoMap = new Map(
            produtos.map(p => [p.referencia, p.descricao || p.nome || ''])
        );

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
                    produto_nome: produtoMap.get(i.produtoReferencia ?? '') || '',
                    created_at: i.createdAt,
                })),
            }))
        );
    } catch (error) {
        console.error('Erro ao buscar volumes:', error);
        return NextResponse.json({ error: 'Erro ao buscar volumes' }, { status: 500 });
    }
}
