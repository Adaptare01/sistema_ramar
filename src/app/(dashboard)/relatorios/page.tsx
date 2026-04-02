'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ClipboardCheck, Search, FileText, CheckCircle, AlertTriangle,
    DollarSign, Clock, Loader2, Filter
} from 'lucide-react';

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Conferencia {
    id: string;
    cargaId: string;
    clienteId: string;
    carga_nome: string;
    cliente_nome: string;
    status: string;
    resumo: { totalExpected: number; totalScanned: number; missing: number; excess: number; extra: number } | null;
    observacoes: string | null;
    operador_nome: string | null;
    faturado: boolean;
    created_at: string;
    finalizado_em: string | null;
    faturado_em: string | null;
}

type TabKey = 'finalizadas' | 'ressalvas' | 'andamento' | 'faturadas';

const TABS: { key: TabKey; label: string; color: string; activeColor: string }[] = [
    { key: 'finalizadas', label: 'Todas Finalizadas', color: 'text-gray-600 border-transparent hover:text-primary', activeColor: 'text-primary border-primary bg-primary/5' },
    { key: 'ressalvas', label: 'Com Ressalvas', color: 'text-gray-600 border-transparent hover:text-amber-600', activeColor: 'text-white bg-amber-500 border-amber-500' },
    { key: 'andamento', label: 'Em Andamento', color: 'text-gray-600 border-transparent hover:text-blue-600', activeColor: 'text-white bg-blue-600 border-blue-600' },
    { key: 'faturadas', label: 'Faturadas', color: 'text-gray-600 border-transparent hover:text-green-600', activeColor: 'text-white bg-green-600 border-green-600' },
];

export default function RelatoriosPage() {
    const router = useRouter();
    const [conferencias, setConferencias] = useState<Conferencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('finalizadas');
    const [filterMes, setFilterMes] = useState('');
    const [filterAno, setFilterAno] = useState('');

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

    // Helpers
    function hasIssues(c: Conferencia) {
        return c.resumo && (c.resumo.missing > 0 || c.resumo.excess > 0 || c.resumo.extra > 0);
    }

    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
    const hasDateFilter = filterMes || filterAno;

    // Filtered lists
    const searchFiltered = conferencias.filter((c) => {
        // Search filter
        const matchSearch =
            c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
            c.carga_nome?.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;

        // Date filter (use finalizado_em for finalizadas, created_at for em_andamento)
        if (filterMes || filterAno) {
            const dateStr = c.finalizado_em || c.created_at;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (filterAno && d.getFullYear() !== parseInt(filterAno)) return false;
            if (filterMes && (d.getMonth() + 1) !== parseInt(filterMes)) return false;
        }

        return true;
    });

    const counts = useMemo(() => ({
        finalizadas: conferencias.filter(c => c.status === 'FINALIZADA').length,
        ressalvas: conferencias.filter(c => c.status === 'FINALIZADA' && hasIssues(c)).length,
        andamento: conferencias.filter(c => c.status === 'EM_ANDAMENTO').length,
        faturadas: conferencias.filter(c => c.faturado).length,
    }), [conferencias]);

    const tabFiltered = useMemo(() => {
        switch (activeTab) {
            case 'finalizadas':
                return searchFiltered.filter(c => c.status === 'FINALIZADA');
            case 'ressalvas':
                return searchFiltered.filter(c => c.status === 'FINALIZADA' && hasIssues(c));
            case 'andamento':
                return searchFiltered.filter(c => c.status === 'EM_ANDAMENTO');
            case 'faturadas':
                return searchFiltered.filter(c => c.faturado);
            default:
                return searchFiltered;
        }
    }, [searchFiltered, activeTab]);

    function formatDate(dateStr: string | null) {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('pt-BR');
    }

    function formatTime(dateStr: string | null) {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ClipboardCheck className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-gray-900">Cargas e Conferências</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${activeTab === tab.key ? tab.activeColor : tab.color
                            }`}
                    >
                        {tab.label} ({counts[tab.key]})
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou carga..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={filterMes}
                        onChange={e => setFilterMes(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Todos os meses</option>
                        {MESES.map((m, i) => (
                            <option key={i} value={String(i + 1)}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={filterAno}
                        onChange={e => setFilterAno(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Todos os anos</option>
                        {yearOptions.map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                    {hasDateFilter && (
                        <button
                            onClick={() => { setFilterMes(''); setFilterAno(''); }}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : tabFiltered.length === 0 ? (
                <div className="card text-center py-16">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum registro encontrado.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tabFiltered.map((conf) => {
                        const issues = hasIssues(conf);
                        const isAndamento = conf.status === 'EM_ANDAMENTO';
                        const borderColor = isAndamento
                            ? 'border-l-blue-500'
                            : conf.faturado
                                ? 'border-l-green-500'
                                : issues
                                    ? 'border-l-amber-500'
                                    : 'border-l-green-500';

                        const displayDate = conf.finalizado_em || conf.created_at;
                        const displayTime = conf.finalizado_em || conf.created_at;

                        return (
                            <div
                                key={conf.id}
                                className={`card border-l-4 ${borderColor} hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* Left: Info */}
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => !isAndamento && router.push(`/relatorios/${conf.id}`)}
                                    >
                                        <h3 className="font-bold text-gray-900 truncate">
                                            {conf.cliente_nome || conf.clienteId}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                            <span>📦</span> {conf.carga_nome}
                                        </p>
                                        {conf.operador_nome && (
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <span>👤</span> <span className="font-medium">Operador:</span> {conf.operador_nome}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                                            {conf.created_at && (
                                                <span className="flex items-center gap-1">
                                                    🟢 Início: {formatTime(conf.created_at)} {formatDate(conf.created_at)}
                                                </span>
                                            )}
                                            {conf.finalizado_em && (
                                                <span className="flex items-center gap-1">
                                                    🏁 Final: {formatTime(conf.finalizado_em)} {formatDate(conf.finalizado_em)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Badges + Actions */}
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                        {/* Status badges */}
                                        {isAndamento ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                <Clock className="w-3 h-3" /> EM ANDAMENTO
                                            </span>
                                        ) : (
                                            <>
                                                {issues ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                        <AlertTriangle className="w-3 h-3" /> RESSALVAS
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                                                        <CheckCircle className="w-3 h-3" /> PERFEITA
                                                    </span>
                                                )}
                                                {conf.faturado && (
                                                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-green-600 text-white">
                                                        FATURADO
                                                    </span>
                                                )}
                                                {conf.faturado_em && (
                                                    <span className="text-xs text-green-600">
                                                        💰 {formatTime(conf.faturado_em)} {formatDate(conf.faturado_em)}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {/* Actions */}
                                        {!isAndamento && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleInvoice(conf.id, !!conf.faturado); }}
                                                    className={`p-1.5 rounded-lg transition-colors ${conf.faturado
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-gray-100 text-gray-400 hover:text-green-600'
                                                        }`}
                                                    title={conf.faturado ? 'Faturado' : 'Marcar como faturado'}
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/relatorios/${conf.id}`)}
                                                    className="text-xs text-primary hover:underline font-medium"
                                                >
                                                    Ver Relatório →
                                                </button>
                                            </div>
                                        )}
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
