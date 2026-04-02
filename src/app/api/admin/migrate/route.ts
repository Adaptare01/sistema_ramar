import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        // Conferencias columns
        await prisma.$executeRawUnsafe(`ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP`);
        await prisma.$executeRawUnsafe(`ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS faturado_em TIMESTAMP`);
        await prisma.$executeRawUnsafe(`ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS observacoes TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS operador_id VARCHAR(255)`);
        await prisma.$executeRawUnsafe(`ALTER TABLE conferencias ADD COLUMN IF NOT EXISTS operador_nome VARCHAR(255)`);

        // Caminhoes table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS caminhoes (
                id VARCHAR(255) PRIMARY KEY,
                placa VARCHAR(10) UNIQUE NOT NULL,
                modelo VARCHAR(100),
                condutor VARCHAR(255),
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Viagens table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS viagens (
                id VARCHAR(255) PRIMARY KEY,
                caminhao_id VARCHAR(255) NOT NULL REFERENCES caminhoes(id),
                data TIMESTAMP NOT NULL,
                km_saida DECIMAL NOT NULL,
                km_chegada DECIMAL,
                observacoes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        return NextResponse.json({ success: true, message: 'Migration applied: conferencias cols + caminhoes + viagens tables' });
    } catch (error) {
        console.error('Migration error:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
