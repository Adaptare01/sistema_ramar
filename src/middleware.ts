import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'velo-adaptare-secret-key-change-in-production'
);

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/health'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Permitir rotas públicas
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Permitir assets estáticos do Next.js
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Verificar token JWT
    const token = req.cookies.get('velo-session')?.value;

    if (!token) {
        // Redirecionar para login em rotas de página
        if (!pathname.startsWith('/api')) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.next();
    } catch {
        // Token inválido/expirado
        if (!pathname.startsWith('/api')) {
            const response = NextResponse.redirect(new URL('/login', req.url));
            response.cookies.delete('velo-session');
            return response;
        }
        return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
