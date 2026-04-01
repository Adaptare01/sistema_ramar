import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP;
            ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS faturado_em TIMESTAMP;
            ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS observacoes TEXT;
        `);

        return NextResponse.json({ success: true, message: 'Migration applied: finalizado_em, faturado_em, observacoes added' });
    } catch (error) {
        console.error('Migration error:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
