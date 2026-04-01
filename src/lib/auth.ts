import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'velo-adaptare-secret-key-change-in-production'
);

const COOKIE_NAME = 'velo-session';

export interface SessionPayload {
    userId: string;
    nome: string;
    email: string;
    perfil: Role;
}

export async function createSession(payload: SessionPayload): Promise<string> {
    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: '/',
    });

    return token;
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

// Verificar se o usuário tem permissão mínima
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
    const hierarchy: Role[] = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'];
    const userLevel = hierarchy.indexOf(userRole);
    const requiredLevel = hierarchy.indexOf(requiredRole);
    return userLevel >= 0 && userLevel <= requiredLevel;
}
