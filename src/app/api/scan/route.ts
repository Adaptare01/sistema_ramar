import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { volumeId, barcode, quantity = 1 } = await req.json();

        // 1. Find product by EAN
        const produto = await prisma.produto.findFirst({ where: { ean: barcode } });
        if (!produto) {
            return NextResponse.json(
                { error: 'Produto não encontrado', code: 'PROD_NOT_FOUND' },
                { status: 404 }
            );
        }

        // 2. Get volume info
        const volume = await prisma.volume.findUnique({
            where: { id: volumeId },
            select: { clienteId: true, cargaId: true },
        });
        if (!volume) {
            return NextResponse.json({ error: 'Volume não encontrado' }, { status: 404 });
        }

        // 3. Check expected items (normalize ref: XLS may strip leading zeros, XML may add them)
        const ref = produto.referencia || '';
        const normalizedRef = /^\d+$/.test(ref) ? ref.padStart(5, '0') : ref;
        const strippedRef = /^\d+$/.test(ref) ? String(parseInt(ref, 10)) : ref;
        const refVariants = [...new Set([ref, normalizedRef, strippedRef].filter(Boolean))];

        const expectedItem = await prisma.cargaItem.findFirst({
            where: {
                cargaId: volume.cargaId!,
                clienteId: volume.clienteId!,
                produtoReferencia: { in: refVariants },
            },
        });

        let isExtra = false;
        let warning = null;

        if (!expectedItem) {
            isExtra = true;
        } else {
            const expectedQty = Number(expectedItem.quantidadeEsperada ?? 0);

            // Get already scanned quantity
            const scannedAgg = await prisma.volumeItem.aggregate({
                where: {
                    volume: { cargaId: volume.cargaId!, clienteId: volume.clienteId! },
                    produtoReferencia: produto.referencia,
                },
                _sum: { quantidade: true },
            });

            const currentTotal = Number(scannedAgg._sum.quantidade ?? 0);
            const newTotal = currentTotal + Number(quantity);

            if (newTotal > expectedQty) {
                warning = {
                    type: 'EXCESS_QUANTITY',
                    message: `ATENÇÃO: Produto ${produto.referencia} (${produto.descricao || produto.nome}) - Quantidade maior que o pedido (${expectedQty}).`,
                    expected: expectedQty,
                    current: currentTotal,
                    attempted: newTotal,
                };
            }
        }

        // 4. Insert scanned item
        const itemId = randomUUID();
        await prisma.volumeItem.create({
            data: {
                id: itemId,
                volumeId,
                produtoEan: barcode,
                produtoReferencia: produto.referencia,
                quantidade: quantity,
            },
        });

        return NextResponse.json({
            success: true,
            item: {
                id: itemId,
                referencia: produto.referencia,
                nome: produto.descricao || produto.nome || '',
                ean: produto.ean,
                quantidade: quantity,
            },
            product: produto,
            isExtra,
            warning,
        });
    } catch (error) {
        console.error('Erro no scan:', error);
        return NextResponse.json({ error: 'Falha ao processar bipagem' }, { status: 500 });
    }
}
