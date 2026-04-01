import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const products = await prisma.produto.findMany({
            orderBy: { descricao: 'asc' },
            take: 1000,
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 });
    }
}
