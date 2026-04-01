import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await getSession();
        if (!session || session.perfil !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Sem permissão — apenas SUPER_ADMIN' }, { status: 403 });
        }

        // Deletar na ordem correta (respeitar foreign keys)
        // 1. conferencias (ref: cargas, clientes)
        // 2. volume_itens (ref: volumes)
        // 3. volumes (ref: cargas, clientes)
        // 4. carga_itens (ref: cargas, clientes)
        // 5. cargas
        // 6. clientes
        // 7. produtos
        const [conferencias, volumeItens, volumes, cargaItens, cargas, clientes, produtos] =
            await prisma.$transaction([
                prisma.conferencia.deleteMany(),
                prisma.volumeItem.deleteMany(),
                prisma.volume.deleteMany(),
                prisma.cargaItem.deleteMany(),
                prisma.carga.deleteMany(),
                prisma.cliente.deleteMany(),
                prisma.produto.deleteMany(),
            ]);

        console.log(`[RESET] Sistema limpo por ${session.email} — conferencias:${conferencias.count} volumeItens:${volumeItens.count} volumes:${volumes.count} cargaItens:${cargaItens.count} cargas:${cargas.count} clientes:${clientes.count} produtos:${produtos.count}`);

        return NextResponse.json({
            success: true,
            message: 'Sistema limpo com sucesso!',
            deletados: {
                conferencias: conferencias.count,
                volumeItens: volumeItens.count,
                volumes: volumes.count,
                cargaItens: cargaItens.count,
                cargas: cargas.count,
                clientes: clientes.count,
                produtos: produtos.count,
            },
        });
    } catch (error) {
        console.error('Erro ao limpar sistema:', error);
        return NextResponse.json({ error: 'Erro ao limpar sistema' }, { status: 500 });
    }
}
