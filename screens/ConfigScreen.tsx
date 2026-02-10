import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Search, RefreshCw, Package, Upload, Pencil, X, Save, Trash2 } from 'lucide-react';
import { ProductDbItem } from '../types';

interface ConfigScreenProps {
    onBack: () => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onBack }) => {
    const [products, setProducts] = useState<ProductDbItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<ProductDbItem | null>(null);
    const [editForm, setEditForm] = useState({ descricao: '', ean: '' });

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

    const handleImportClick = () => {
        const input = document.getElementById('product-import-input') as HTMLInputElement;
        if (input) input.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm(`Deseja importar os produtos do arquivo "${file.name}"? Isso atualizará o banco de dados.`)) {
            e.target.value = '';
            return;
        }

        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const base64 = (evt.target?.result as string).split(',')[1];
                try {

                    const res = await api.importProducts(base64);

                    // Backend returns { success: true, message: string }
                    alert(res.message || 'Importação realizada com sucesso!');
                    loadProducts();
                } catch (err: any) {
                    alert('Erro na importação: ' + (err.message || err));
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            alert('Erro ao ler arquivo');
        } finally {
            e.target.value = '';
            setLoading(false);
        }
    };

    const handleEditClick = (product: ProductDbItem) => {
        setEditingProduct(product);
        setEditForm({
            descricao: product.descricao,
            ean: product.ean || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setEditForm({ descricao: '', ean: '' });
    };

    const handleDeleteClick = async (product: ProductDbItem) => {
        if (!confirm(`Tem certeza que deseja excluir o produto "${product.descricao}"?\nEsta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            await api.deleteProduct(product.id);
            setProducts(prev => prev.filter(p => p.id !== product.id));
            alert('Produto excluído com sucesso!');
        } catch (err: any) {
            console.error(err);
            alert('Erro ao excluir produto: ' + err.message);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingProduct) return;
        if (!editForm.descricao.trim()) {
            alert('A descrição é obrigatória');
            return;
        }

        try {
            await api.updateProduct(editingProduct.id, {
                descricao: editForm.descricao,
                ean: editForm.ean
            });

            // Update local state to reflect changes immediately
            setProducts(prev => prev.map(p =>
                p.id === editingProduct.id
                    ? { ...p, descricao: editForm.descricao, ean: editForm.ean }
                    : p
            ));

            alert('Produto atualizado com sucesso!');
            setEditingProduct(null);
        } catch (err: any) {
            console.error(err);
            alert('Erro ao atualizar produto: ' + err.message);
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
                        <ArrowLeft className="w-5 h-5 text-black" />
                    </button>
                    <h2 className="text-lg font-bold text-black">Configurações - Produtos</h2>
                </div>
                <button onClick={loadProducts} className="bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 text-[var(--primary)] p-2 rounded-lg transition mr-2" title="Recarregar">
                    <RefreshCw size={20} />
                </button>

                <input
                    type="file"
                    id="product-import-input"
                    accept=".csv, .xls, .xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    onClick={handleImportClick}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-md"
                >
                    <Upload size={18} />
                    <span>Importar XLS/CSV</span>
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
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-black p-4 pl-12 rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                        <p className="text-black">Carregando produtos...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid gap-4">
                        <p className="text-sm text-black mb-2">Total de {filteredProducts.length} produtos encontrados</p>
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)]/50 transition flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--bg-app)] rounded-lg flex items-center justify-center text-black">
                                    <Package size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-black truncate">{product.descricao}</h3>
                                    <div className="flex gap-4 mt-1 text-xs text-black font-mono">
                                        <span>REF: <span className="text-black">{product.referencia}</span></span>
                                        <span>EAN: <span className="text-black">{product.ean || '-'}</span></span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEditClick(product)}
                                    className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-full transition"
                                    title="Editar Produto"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(product)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition"
                                    title="Excluir Produto"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-black">
                        <p>Nenhum produto encontrado.</p>
                    </div>
                )}
            </div>
            {/* Edit Modal */}
            {
                editingProduct && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={handleCancelEdit}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
                            >
                                <X size={24} />
                            </button>

                            <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
                                <Pencil size={20} className="text-[var(--primary)]" />
                                Editar Produto
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Referência (Fixo)</label>
                                    <input
                                        type="text"
                                        value={editingProduct.referencia}
                                        disabled
                                        className="w-full bg-black/20 border border-[var(--border-color)] text-gray-500 p-3 rounded-xl cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Descrição</label>
                                    <input
                                        type="text"
                                        value={editForm.descricao}
                                        onChange={e => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-200 text-black p-3 rounded-xl focus:border-[var(--primary)] outline-none transition"
                                        placeholder="Nome do produto"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">EAN / Código de Barras</label>
                                    <input
                                        type="text"
                                        value={editForm.ean}
                                        onChange={e => setEditForm(prev => ({ ...prev, ean: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-200 text-black p-3 rounded-xl focus:border-[var(--primary)] outline-none transition font-mono"
                                        placeholder="Sem código de barras"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 bg-transparent border border-[var(--border-color)] text-gray-700 py-3 rounded-xl hover:bg-gray-100 transition font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl hover:bg-blue-600 transition font-medium shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2"
                                    >
                                        <Save size={18} />
                                        Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
