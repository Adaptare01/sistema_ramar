import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { volumeId, barcode, quantity, forceInsert = false } = body;

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

        const isExtra = !expectedItem;
        const productName = produto.descricao || produto.nome || '';

        // ─── LOOKUP MODE: no quantity → just return product info, don't insert ───
        if (quantity === undefined || quantity === null) {
            return NextResponse.json({
                mode: 'lookup',
                product: {
                    referencia: produto.referencia,
                    nome: productName,
                    ean: produto.ean,
                },
                isExtra,
            });
        }

        // ─── INSERT MODE: quantity provided ───

        // If extra and not forced → ask confirmation
        if (isExtra && !forceInsert) {
            return NextResponse.json({
                requiresConfirmation: true,
                product: {
                    referencia: produto.referencia,
                    nome: productName,
                    ean: produto.ean,
                },
                isExtra: true,
            });
        }

        // Check excess quantity warning (only for items in pedido)
        let warning = null;
        if (expectedItem) {
            const expectedQty = Number(expectedItem.quantidadeEsperada ?? 0);
            const scannedAgg = await prisma.volumeItem.aggregate({
                where: {
                    volume: { cargaId: volume.cargaId!, clienteId: volume.clienteId! },
                    produtoReferencia: { in: refVariants },
                },
                _sum: { quantidade: true },
            });
            const currentTotal = Number(scannedAgg._sum.quantidade ?? 0);
            const newTotal = currentTotal + Number(quantity);

            if (newTotal > expectedQty) {
                warning = {
                    type: 'EXCESS_QUANTITY',
                    message: `ATENÇÃO: Produto ${produto.referencia} (${productName}) - Quantidade maior que o pedido (${expectedQty}).`,
                    expected: expectedQty,
                    current: currentTotal,
                    attempted: newTotal,
                };
            }
        }

        // Insert scanned item
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
                nome: productName,
                ean: produto.ean,
                quantidade: quantity,
            },
            isExtra,
            warning,
        });
    } catch (error) {
        console.error('Erro no scan:', error);
        return NextResponse.json({ error: 'Falha ao processar bipagem' }, { status: 500 });
    }
}
