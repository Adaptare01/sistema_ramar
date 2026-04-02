import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
    try {
        const caminhoes = await prisma.caminhao.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { viagens: true } } },
        });
        return NextResponse.json(caminhoes);
    } catch (error) {
        console.error('Erro ao listar caminhões:', error);
        return NextResponse.json({ error: 'Erro ao listar caminhões' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { placa, modelo, condutor } = await req.json();

        if (!placa?.trim()) {
            return NextResponse.json({ error: 'Placa é obrigatória' }, { status: 400 });
        }

        const existing = await prisma.caminhao.findUnique({ where: { placa: placa.trim().toUpperCase() } });
        if (existing) {
            return NextResponse.json({ error: 'Já existe um caminhão com esta placa' }, { status: 409 });
        }

        const caminhao = await prisma.caminhao.create({
            data: {
                id: randomUUID(),
                placa: placa.trim().toUpperCase(),
                modelo: modelo?.trim() || null,
                condutor: condutor?.trim() || null,
            },
        });

        return NextResponse.json({ success: true, caminhao });
    } catch (error) {
        console.error('Erro ao criar caminhão:', error);
        return NextResponse.json({ error: 'Erro ao criar caminhão' }, { status: 500 });
    }
}
