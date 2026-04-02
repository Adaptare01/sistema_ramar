import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
    try {
        const viagens = await prisma.viagem.findMany({
            orderBy: { data: 'desc' },
            include: {
                caminhao: { select: { placa: true, modelo: true, condutor: true } },
            },
        });

        return NextResponse.json(
            viagens.map((v) => ({
                ...v,
                kmSaida: Number(v.kmSaida),
                kmChegada: v.kmChegada ? Number(v.kmChegada) : null,
                kmPercorrido: v.kmChegada ? Number(v.kmChegada) - Number(v.kmSaida) : null,
                placa: v.caminhao.placa,
                modelo: v.caminhao.modelo,
                condutor: v.caminhao.condutor,
            }))
        );
    } catch (error) {
        console.error('Erro ao listar viagens:', error);
        return NextResponse.json({ error: 'Erro ao listar viagens' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { caminhaoId, data, kmSaida, kmChegada, observacoes } = await req.json();

        if (!caminhaoId || !data || kmSaida === undefined) {
            return NextResponse.json({ error: 'Caminhão, data e KM saída são obrigatórios' }, { status: 400 });
        }

        const viagem = await prisma.viagem.create({
            data: {
                id: randomUUID(),
                caminhaoId,
                data: new Date(data),
                kmSaida,
                kmChegada: kmChegada || null,
                observacoes: observacoes?.trim() || null,
            },
        });

        return NextResponse.json({ success: true, viagem });
    } catch (error) {
        console.error('Erro ao criar viagem:', error);
        return NextResponse.json({ error: 'Erro ao criar viagem' }, { status: 500 });
    }
}
