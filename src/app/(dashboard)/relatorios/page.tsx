'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Search, FileText, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';

interface Conferencia {
    id: string;
    carga_id: string;
    cliente_id: string;
    carga_nome: string;
    cliente_nome: string;
    status: string;
    resumo: { totalExpected: number; totalScanned: number; missing: number; excess: number; extra: number } | null;
    faturado: boolean;
    created_at: string;
}

export default function RelatoriosPage() {
    const router = useRouter();
    const [conferencias, setConferencias] = useState<Conferencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadConferencias();
    }, []);

    async function loadConferencias() {
        try {
            const res = await fetch('/api/conferencias');
            const data = await res.json();
            setConferencias(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function toggleInvoice(id: string, currentValue: boolean) {
        try {
            await fetch(`/api/conferencias/${id}/invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faturado: !currentValue }),
            });
            loadConferencias();
        } catch (err) {
            console.error(err);
        }
    }

    const filtered = conferencias.filter(
        (c) =>
            c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
            c.carga_nome?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

            {/* Search */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por cliente ou carga..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-10"
                />
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card animate-pulse h-20" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card text-center py-12">
                    <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma conferência finalizada</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((conf) => {
                        const hasIssues = conf.resumo && (conf.resumo.missing > 0 || conf.resumo.excess > 0 || conf.resumo.extra > 0);
                        return (
                            <div key={conf.id} className="card">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/relatorios/${conf.id}`)}>
                                        <div className="flex items-center gap-2">
                                            {hasIssues ? (
                                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                            <p className="font-medium text-gray-900 truncate">
                                                {conf.cliente_nome || conf.cliente_id}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate">
                                            {conf.carga_nome}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                            <span>{new Date(conf.created_at).toLocaleDateString('pt-BR')}</span>
                                            {conf.resumo && (
                                                <span>
                                                    {conf.resumo.totalScanned}/{conf.resumo.totalExpected} itens
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        <button
                                            onClick={() => toggleInvoice(conf.id, !!conf.faturado)}
                                            className={`p-2 rounded-lg transition-colors ${conf.faturado
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-gray-100 text-gray-400 hover:text-green-600'
                                                }`}
                                            title={conf.faturado ? 'Faturado' : 'Marcar como faturado'}
                                        >
                                            <DollarSign className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => router.push(`/relatorios/${conf.id}`)}
                                            className="p-2 text-gray-400 hover:text-primary"
                                        >
                                            <FileText className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
