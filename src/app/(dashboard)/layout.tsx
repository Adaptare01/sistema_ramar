'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Truck,
    ClipboardCheck,
    Settings,
    LogOut,
    Menu,
    X,
    MapPin,
} from 'lucide-react';

interface UserSession {
    userId: string;
    nome: string;
    email: string;
    perfil: string;
}

const SessionContext = createContext<UserSession | null>(null);
export const useSession = () => useContext(SessionContext);

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Início', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] },
    { id: 'cargas', label: 'Cargas', href: '/cargas', icon: Truck, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] },
    { id: 'relatorios', label: 'Relatórios', href: '/relatorios', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'] },
    { id: 'frota', label: 'Frota', href: '/frota', icon: MapPin, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'config', label: 'Config', href: '/config', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [session, setSession] = useState<UserSession | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => {
                if (!res.ok) throw new Error('Not authenticated');
                return res.json();
            })
            .then(setSession)
            .catch(() => router.push('/login'))
            .finally(() => setLoading(false));
    }, [router]);

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!session) return null;

    const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(session.perfil));

    return (
        <SessionContext.Provider value={session}>
            <div className="min-h-screen bg-gray-50">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="p-1">
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="font-semibold text-gray-900">Sistema Ramar</h1>
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {session.nome.charAt(0).toUpperCase()}
                    </div>
                </header>

                {/* Sidebar Overlay (mobile) */}
                {sidebarOpen && (
                    <div className="lg:hidden fixed inset-0 z-40 flex">
                        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                        <div className="relative w-64 bg-white shadow-xl flex flex-col">
                            <SidebarContent
                                session={session}
                                visibleNav={visibleNav}
                                pathname={pathname}
                                onLogout={handleLogout}
                                onClose={() => setSidebarOpen(false)}
                            />
                        </div>
                    </div>
                )}

                <div className="flex">
                    {/* Sidebar (desktop) */}
                    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
                        <SidebarContent
                            session={session}
                            visibleNav={visibleNav}
                            pathname={pathname}
                            onLogout={handleLogout}
                        />
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 lg:ml-64">
                        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Bottom Nav (mobile) */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
                    <div className="flex justify-around py-2">
                        {visibleNav.slice(0, 4).map((item) => {
                            const Icon = item.icon;
                            const active = pathname.startsWith(item.href);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(item.href)}
                                    className={`flex flex-col items-center px-3 py-1 text-xs ${active ? 'text-primary font-semibold' : 'text-gray-500'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 mb-0.5" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Bottom padding for mobile nav */}
                <div className="lg:hidden h-16" />
            </div>
        </SessionContext.Provider>
    );
}

function SidebarContent({
    session,
    visibleNav,
    pathname,
    onLogout,
    onClose,
}: {
    session: UserSession;
    visibleNav: typeof NAV_ITEMS;
    pathname: string;
    onLogout: () => void;
    onClose?: () => void;
}) {
    const router = useRouter();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">Sistema Ramar</h2>
                        <p className="text-xs text-gray-400">Conferência de Cargas</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-1">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {visibleNav.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                router.push(item.href);
                                onClose?.();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* User / Logout */}
            <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {session.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{session.nome}</p>
                        <p className="text-xs text-gray-400 truncate">{session.perfil}</p>
                    </div>
                    <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sair">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
