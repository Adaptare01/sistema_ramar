import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !can(session.perfil, 'VIEW_CONFIG')) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !can(session.perfil, 'CREATE_USER')) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }

        const { nome, email, senha, perfil } = await req.json();

        if (!nome || !email || !senha) {
            return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
        }

        // Check duplicate email
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const user = await prisma.user.create({
            data: {
                nome,
                email: email.toLowerCase().trim(),
                senha: senhaHash,
                perfil: perfil || 'OPERADOR',
            },
            select: { id: true, nome: true, email: true, perfil: true },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }
}
