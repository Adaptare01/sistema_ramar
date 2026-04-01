'use client';

import { useEffect, useState } from 'react';
import { Upload, Search, Edit2, Trash2, Save, X, UserPlus, Package, Shield, AlertTriangle } from 'lucide-react';

interface Product {
    id: string;
    referencia: string;
    descricao: string;
    ean: string;
}

interface UserSession {
    userId: string;
    nome: string;
    email: string;
    perfil: string;
}

export default function ConfigPage() {
    const [tab, setTab] = useState<'produtos' | 'usuarios' | 'sistema'>('produtos');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ descricao: '', ean: '' });
    const [uploading, setUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

    useEffect(() => {
        // Buscar perfil do usuário logado
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.userId) setCurrentUser(data);
            })
            .catch(() => { });
    }, []);

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

    const isSuperAdmin = currentUser?.perfil === 'SUPER_ADMIN';

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
                {isSuperAdmin && (
                    <button
                        onClick={() => setTab('sistema')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === 'sistema' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                            }`}
                    >
                        <Shield className="w-4 h-4 inline mr-1" />
                        Sistema
                    </button>
                )}
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
            {tab === 'sistema' && isSuperAdmin && <SystemTab />}
        </div>
    );
}

// ─── ABA USUÁRIOS ───────────────────────────────────────────
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

// ─── ABA SISTEMA (SUPER_ADMIN ONLY) ────────────────────────
function SystemTab() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        deletados?: Record<string, number>;
    } | null>(null);
    const [confirmText, setConfirmText] = useState('');

    async function handleReset() {
        setResetting(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/reset', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setShowConfirm(false);
                setConfirmText('');
            } else {
                setResult({ success: false, message: data.error || 'Erro ao limpar sistema' });
            }
        } catch (err) {
            console.error(err);
            setResult({ success: false, message: 'Erro de conexão' });
        } finally {
            setResetting(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* Resultado da limpeza */}
            {result && (
                <div className={`p-4 rounded-lg border ${result.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <p className="font-medium text-sm">{result.success ? '✅' : '❌'} {result.message}</p>
                    {result.success && result.deletados && (
                        <div className="mt-2 text-xs space-y-1">
                            <p>Registros excluídos:</p>
                            <ul className="list-disc list-inside ml-2">
                                {result.deletados.cargas > 0 && <li>{result.deletados.cargas} carga(s)</li>}
                                {result.deletados.cargaItens > 0 && <li>{result.deletados.cargaItens} item(ns) de carga</li>}
                                {result.deletados.clientes > 0 && <li>{result.deletados.clientes} cliente(s)</li>}
                                {result.deletados.volumes > 0 && <li>{result.deletados.volumes} volume(s)</li>}
                                {result.deletados.volumeItens > 0 && <li>{result.deletados.volumeItens} item(ns) de volume</li>}
                                {result.deletados.conferencias > 0 && <li>{result.deletados.conferencias} conferência(s)</li>}
                                {result.deletados.produtos > 0 && <li>{result.deletados.produtos} produto(s)</li>}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Zona de Perigo */}
            <div className="border-2 border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-800">Zona de Perigo</h3>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Limpar Sistema */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Limpar Sistema</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Remove <strong>todos</strong> os dados operacionais: XMLs importados, cargas,
                                clientes, volumes, conferências e produtos cadastrados.
                            </p>
                            <p className="text-xs text-green-700 mt-1 font-medium">
                                ⚡ Usuários NÃO serão apagados.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Limpar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Tem certeza?</h3>
                                <p className="text-sm text-gray-500">Esta ação NÃO pode ser desfeita.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                            <p className="font-medium mb-2">Serão apagados permanentemente:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Todas as cargas e XMLs importados</li>
                                <li>Todos os itens de carga</li>
                                <li>Todos os clientes</li>
                                <li>Todos os volumes e itens bipados</li>
                                <li>Todas as conferências finalizadas</li>
                                <li>Todos os produtos cadastrados</li>
                            </ul>
                        </div>

                        <div>
                            <label className="text-sm text-gray-700 block mb-1">
                                Digite <strong className="text-red-600">LIMPAR</strong> para confirmar:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="LIMPAR"
                                className="input-field text-center font-mono tracking-widest"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    setConfirmText('');
                                }}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={confirmText !== 'LIMPAR' || resetting}
                                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {resetting ? 'Limpando...' : 'Sim, limpar tudo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
