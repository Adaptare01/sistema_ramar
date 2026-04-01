import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Try to find by EAN first (for barcode scan)
        const product = await prisma.produto.findFirst({ where: { ean: id } });
        if (!product) {
            return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
        }
        return NextResponse.json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { descricao, ean } = await req.json();
    try {
        const result = await prisma.produto.update({
            where: { id },
            data: { descricao, ean },
        });
        return NextResponse.json({ success: true, product: result });
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        return NextResponse.json({ error: 'Falha ao atualizar produto' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.produto.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        return NextResponse.json({ error: 'Falha ao excluir produto' }, { status: 500 });
    }
}
