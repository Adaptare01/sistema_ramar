'use client';

import { useEffect, useState } from 'react';
import { Upload, Search, Edit2, Trash2, Save, X, UserPlus, Package } from 'lucide-react';

interface Product {
    id: string;
    referencia: string;
    descricao: string;
    ean: string;
}

export default function ConfigPage() {
    const [tab, setTab] = useState<'produtos' | 'usuarios'>('produtos');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ descricao: '', ean: '' });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (tab === 'produtos') loadProducts();
    }, [tab]);

    async function loadProducts() {
        setLoading(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleUploadProducts(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const res = await fetch('/api/products/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileContent: base64 }),
            });

            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                loadProducts();
            } else {
                alert(data.error || 'Erro ao importar');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao importar arquivo');
        } finally {
            setUploading(false);
        }
    }

    function startEdit(product: Product) {
        setEditing(product.id);
        setEditForm({ descricao: product.descricao || '', ean: product.ean || '' });
    }

    async function saveEdit(id: string) {
        try {
            await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            setEditing(null);
            loadProducts();
        } catch (err) {
            console.error(err);
        }
    }

    async function deleteProduct(id: string) {
        if (!confirm('Excluir este produto?')) return;
        try {
            await fetch(`/api/products/${id}`, { method: 'DELETE' });
            loadProducts();
        } catch (err) {
            console.error(err);
        }
    }

    const filtered = products.filter(
        (p) =>
            p.referencia?.toLowerCase().includes(search.toLowerCase()) ||
            p.descricao?.toLowerCase().includes(search.toLowerCase()) ||
            p.ean?.includes(search)
    );

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setTab('produtos')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === 'produtos' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                        }`}
                >
                    <Package className="w-4 h-4 inline mr-1" />
                    Produtos
                </button>
                <button
                    onClick={() => setTab('usuarios')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === 'usuarios' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                        }`}
                >
                    <UserPlus className="w-4 h-4 inline mr-1" />
                    Usuários
                </button>
            </div>

            {tab === 'produtos' && (
                <>
                    {/* Import */}
                    <div className="card flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Importar Planilha</p>
                            <p className="text-xs text-gray-500">Substitui todos os produtos (XLS/XLSX)</p>
                        </div>
                        <label className="btn-primary cursor-pointer text-sm">
                            {uploading ? 'Processando...' : (
                                <>
                                    <Upload className="w-4 h-4 inline mr-1" />
                                    Importar
                                </>
                            )}
                            <input
                                type="file"
                                accept=".xls,.xlsx"
                                onChange={handleUploadProducts}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>

                    {/* Products Table */}
                    {loading ? (
                        <div className="card animate-pulse h-40" />
                    ) : (
                        <div className="card overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                                            <th className="px-4 py-2">Referência</th>
                                            <th className="px-4 py-2">Descrição</th>
                                            <th className="px-4 py-2">EAN</th>
                                            <th className="px-4 py-2 w-24">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filtered.slice(0, 100).map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-mono text-xs">{p.referencia}</td>
                                                <td className="px-4 py-2">
                                                    {editing === p.id ? (
                                                        <input
                                                            value={editForm.descricao}
                                                            onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                                                            className="input-field text-xs py-1"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-700 truncate block max-w-[200px]">{p.descricao}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {editing === p.id ? (
                                                        <input
                                                            value={editForm.ean}
                                                            onChange={(e) => setEditForm({ ...editForm, ean: e.target.value })}
                                                            className="input-field text-xs py-1 font-mono"
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-xs">{p.ean || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {editing === p.id ? (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => saveEdit(p.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => startEdit(p)} className="p-1 text-gray-400 hover:text-primary rounded">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => deleteProduct(p.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filtered.length > 100 && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                    Mostrando 100 de {filtered.length} produtos
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            {tab === 'usuarios' && <UsersTab />}
        </div>
    );
}

function UsersTab() {
    const [users, setUsers] = useState<Array<{ id: string; nome: string; email: string; perfil: string; ativo: boolean }>>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'OPERADOR' });

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                setShowCreate(false);
                setForm({ nome: '', email: '', senha: '', perfil: 'OPERADOR' });
                loadUsers();
            } else {
                alert(data.error || 'Erro ao criar usuário');
            }
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Gerenciar usuários do sistema</p>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm flex items-center gap-1">
                    <UserPlus className="w-4 h-4" />
                    Novo Usuário
                </button>
            </div>

            {showCreate && (
                <form onSubmit={handleCreate} className="card space-y-3">
                    <input
                        placeholder="Nome"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className="input-field"
                        required
                    />
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="input-field"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        className="input-field"
                        required
                    />
                    <select
                        value={form.perfil}
                        onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                        className="input-field"
                    >
                        <option value="OPERADOR">Operador</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                    <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-sm">Criar</button>
                        <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancelar</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="card animate-pulse h-20" />
            ) : users.length === 0 ? (
                <div className="card text-center py-8">
                    <p className="text-gray-500 text-sm">Nenhum usuário cadastrado</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {users.map((u) => (
                        <div key={u.id} className="card flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">{u.nome}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.perfil === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                    u.perfil === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                        u.perfil === 'SUPERVISOR' ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-600'
                                    }`}>
                                    {u.perfil}
                                </span>
                                <span className={`w-2 h-2 rounded-full ${u.ativo ? 'bg-green-500' : 'bg-red-400'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
