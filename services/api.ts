import { ClientData } from '../types';

const API_Base = '/api';

export const api = {
    importXML: async (xmlContent: string, fileName: string): Promise<{ success: boolean; data: { clients: ClientData[], cargaId: string } }> => {
        const response = await fetch(`${API_Base}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xmlContent, fileName })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || err.error || 'Falha na importação');
        }

        return response.json();
    },

    getDashboardStats: async (): Promise<{ totalCargas: number; volumesAtivos: number; progresso: number; recentActivity: any[] }> => {
        const response = await fetch(`${API_Base}/dashboard`);
        if (!response.ok) throw new Error('Falha ao buscar dados do dashboard');
        return response.json();
    },

    // Conference Methods
    createVolume: async (cargaId: string, clienteId: string) => {
        const response = await fetch(`${API_Base}/volumes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cargaId, clienteId })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao criar volume');
        }
        return response.json();
    },

    closeVolume: async (volumeId: string) => {
        const response = await fetch(`${API_Base}/volumes/${volumeId}/close`, { method: 'POST' });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao fechar volume');
        }
        return response.json();
    },

    reopenVolume: async (volumeId: string) => {
        const response = await fetch(`${API_Base}/volumes/${volumeId}/reopen`, { method: 'POST' });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao reabrir volume');
        }
        return response.json();
    },

    scanItem: async (volumeId: string, barcode: string, quantity: number = 1) => {
        const response = await fetch(`${API_Base}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volumeId, barcode, quantity })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao bipar item');
        }
        return response.json();
    },

    getProduct: async (ean: string) => {
        const response = await fetch(`${API_Base}/products/${ean}`);
        if (!response.ok) throw new Error('Produto não encontrado');
        return response.json();
    },

    getAllProducts: async () => {
        const response = await fetch(`${API_Base}/products`);
        if (!response.ok) throw new Error('Falha ao listar produtos');
        return response.json();
    },

    deleteItem: async (itemId: string) => {
        const response = await fetch(`${API_Base}/items/${itemId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Falha ao remover item');
        return response.json();
    },

    updateItemQuantity: async (itemId: string, quantity: number) => {
        const response = await fetch(`${API_Base}/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });
        if (!response.ok) throw new Error('Falha ao atualizar quantidade');
        return response.json();
    },

    getVolumes: async (clienteId: string, cargaId: string) => {
        const response = await fetch(`${API_Base}/clients/${clienteId}/volumes?cargaId=${cargaId}`);
        if (!response.ok) throw new Error('Falha ao buscar volumes');
        return response.json();
    },

    getCargas: async () => {
        const response = await fetch(`${API_Base}/cargas`);
        if (!response.ok) throw new Error('Falha ao listar cargas');
        return response.json();
    },

    getClientsForCarga: async (cargaId: string) => {
        const response = await fetch(`${API_Base}/cargas/${cargaId}/clients`);
        if (!response.ok) throw new Error('Falha ao buscar clientes da carga');
        return response.json();
    },

    importProducts: async (fileContent: string): Promise<{ success: boolean; details: any }> => {
        const response = await fetch(`${API_Base}/products/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileContent })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || err.error || 'Falha na importação de produtos');
        }

        return response.json();
    },

    updateProduct: async (id: string, updates: Partial<{ descricao: string; ean: string }>) => {
        const response = await fetch(`${API_Base}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao atualizar produto');
        }

        return response.json();
    },

    deleteProduct: async (id: string) => {
        const response = await fetch(`${API_Base}/products/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao excluir produto');
        }
        return response.json();
    },

    // Finished Conferences
    finalizeConference: async (data: { cargaId: string, clienteId: string, resumo: any, reportSnapshot: any }) => {
        const response = await fetch(`${API_Base}/conferencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Falha ao finalizar conferência');
        return response.json();
    },

    getFinishedConferences: async () => {
        const response = await fetch(`${API_Base}/conferencias`);
        if (!response.ok) throw new Error('Falha ao listar conferências');
        return response.json();
    },

    getConferenceDetails: async (id: string) => {
        const response = await fetch(`${API_Base}/conferencias/${id}`);
        if (!response.ok) throw new Error('Falha ao obter detalhes da conferência');
        return response.json();
    },

    getInProgressConferences: async () => {
        const response = await fetch(`${API_Base}/conferencias/in-progress`);
        if (!response.ok) throw new Error('Falha ao listar conferências em andamento');
        return response.json();
    }
};
