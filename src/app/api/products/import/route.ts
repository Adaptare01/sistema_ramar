import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';
import { read, utils } from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        const { fileContent } = await req.json();

        if (!fileContent) {
            return NextResponse.json({ error: 'Conteúdo do arquivo é obrigatório' }, { status: 400 });
        }

        const buffer = Buffer.from(fileContent, 'base64');
        const workbook = read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = utils.sheet_to_json<string[]>(sheet, { header: 1 });

        // Delete all existing products (full replace)
        await prisma.produto.deleteMany();

        let insertedCount = 0;

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            let ref: string, desc: string, ean: string;

            if (row.length === 3) {
                ref = String(row[0] || '').trim();
                desc = String(row[1] || '').trim();
                ean = String(row[2] || '').trim();
            } else {
                ref = String(row[2] || row[0] || '').trim();
                desc = String(row[3] || row[1] || '').trim();
                ean = String(row[5] || row[2] || '').trim();
            }

            if (!ref) continue;
            // Normalize numeric refs to 5 digits with leading zeros (match XML format)
            if (/^\d+$/.test(ref) && ref.length < 5) {
                ref = ref.padStart(5, '0');
            }
            if (ean.length > 20) ean = ean.substring(0, 20);

            await prisma.produto.create({
                data: { id: randomUUID(), referencia: ref, descricao: desc, ean },
            });
            insertedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Importação concluída! ${insertedCount} produtos importados (Substituição Total).`,
        });
    } catch (error) {
        console.error('Erro na importação de produtos:', error);
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ error: 'Falha ao processar arquivo: ' + msg }, { status: 500 });
    }
}
