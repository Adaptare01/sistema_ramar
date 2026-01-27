import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Search, RefreshCw, Package } from 'lucide-react';
import { ProductDbItem } from '../types';

interface ConfigScreenProps {
    onBack: () => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onBack }) => {
    const [products, setProducts] = useState<ProductDbItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await api.getAllProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const filteredProducts = products.filter(p =>
        (p.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.referencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ean || '').includes(searchTerm)
    );

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-white relative">
            {/* Header */}
            <div className="bg-[var(--bg-panel)]/90 backdrop-blur-sm border-b border-[var(--border-color)] p-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-200">Configurações - Produtos</h2>
                </div>
                <button onClick={loadProducts} className="bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] p-2 rounded-lg transition" title="Recarregar">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">

                {/* Search Bar */}
                <div className="mb-6 relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, referência ou EAN..."
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-white p-4 pl-12 rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                        <p className="text-gray-400">Carregando produtos...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid gap-4">
                        <p className="text-sm text-gray-400 mb-2">Total de {filteredProducts.length} produtos encontrados</p>
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)]/50 transition flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--bg-app)] rounded-lg flex items-center justify-center text-gray-500">
                                    <Package size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-200 truncate">{product.descricao}</h3>
                                    <div className="flex gap-4 mt-1 text-xs text-gray-500 font-mono">
                                        <span>REF: <span className="text-gray-300">{product.referencia}</span></span>
                                        <span>EAN: <span className="text-gray-300">{product.ean || '-'}</span></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>Nenhum produto encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
