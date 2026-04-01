import { Role } from '@prisma/client';

// Definição de permissões por funcionalidade
export const PERMISSIONS = {
    // Usuários
    CREATE_USER: ['SUPER_ADMIN'] as Role[],
    EDIT_USER: ['SUPER_ADMIN', 'ADMIN'] as Role[],

    // Cargas e XML
    IMPORT_XML: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'] as Role[],
    VIEW_CARGAS: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] as Role[],

    // Conferência / Bipagem
    SCAN_ITEMS: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] as Role[],
    FINALIZE_CONFERENCE: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] as Role[],

    // Relatórios e Faturamento
    VIEW_REPORTS: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'] as Role[],
    TOGGLE_INVOICE: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'] as Role[],

    // Configurações
    VIEW_CONFIG: ['SUPER_ADMIN', 'ADMIN'] as Role[],
    MANAGE_PRODUCTS: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'] as Role[],
};

export function can(userRole: Role, permission: keyof typeof PERMISSIONS): boolean {
    return PERMISSIONS[permission].includes(userRole);
}

// Itens de navegação visíveis por perfil
export function getNavItems(role: Role) {
    const items = [
        { id: 'dashboard', label: 'Início', href: '/', roles: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] },
        { id: 'cargas', label: 'Cargas', href: '/cargas', roles: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'] },
        { id: 'relatorios', label: 'Relatórios', href: '/relatorios', roles: ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'] },
        { id: 'config', label: 'Config', href: '/config', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    return items.filter(item => item.roles.includes(role));
}
