
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Search, CheckCircle, FileText, Calendar, User, Package, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../components/Card';

interface Conference {
    id: string;
    carga_id: string;
    cliente_id: string;
    carga_nome: string;
    cliente_nome: string;
    status: string;
    created_at: string;
    resumo: any;
}

interface FinishedLoadsScreenProps {
    onBack: () => void;
    onSelectConference: (id: string) => void;
}

export const FinishedLoadsScreen = ({ onBack, onSelectConference }: FinishedLoadsScreenProps) => {
    const [conferences, setConferences] = useState<Conference[]>([]);
    const [inProgress, setInProgress] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'ISSUES' | 'IN_PROGRESS' | 'INVOICED'>('ALL');

    useEffect(() => {
        loadConferences();
    }, []);

    const loadConferences = async () => {
        try {
            setLoading(true);
            const [finished, active] = await Promise.all([
                api.getFinishedConferences(),
                api.getInProgressConferences()
            ]);
            setConferences(finished);
            setInProgress(active);
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredList = () => {
        let list: any[] = [];
        if (activeTab === 'IN_PROGRESS') {
            list = inProgress;
        } else if (activeTab === 'ISSUES') {
            list = conferences.filter(c =>
                (c.resumo?.missing || 0) > 0 || (c.resumo?.excess || 0) > 0 || (c.resumo?.extra || 0) > 0
            );
        } else if (activeTab === 'INVOICED') {
            list = conferences.filter(c => c.faturado === true);
        } else {
            // ALL tab: show only NON-invoiced conferences
            list = conferences.filter(c => c.faturado !== true);
        }

        return list.filter(c =>
            c.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.carga_nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const filtered = getFilteredList();

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-white">
            {/* Header */}
            <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-color)] flex items-center gap-3 sticky top-0 z-10 shadow-md">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition">
                    <ArrowLeft className="w-6 h-6 text-black" />
                </button>
                <h1 className="text-xl font-bold text-black flex items-center gap-2">
                    <CheckCircle className="text-green-500" />
                    Cargas e Conferências
                </h1>
            </div>

            {/* Tabs */}
            <div className="flex p-4 pb-0 gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'ALL' ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    Todas Finalizadas ({conferences.filter(c => c.faturado !== true).length})
                </button>
                <button
                    onClick={() => setActiveTab('ISSUES')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'ISSUES' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    Com Ressalvas ({conferences.filter(c => (c.resumo?.missing || 0) > 0 || (c.resumo?.excess || 0) > 0 || (c.resumo?.extra || 0) > 0).length})
                </button>
                <button
                    onClick={() => setActiveTab('IN_PROGRESS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'IN_PROGRESS' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    Em Andamento ({inProgress.length})
                </button>
                <button
                    onClick={() => setActiveTab('INVOICED')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'INVOICED' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    Faturadas ({conferences.filter(c => c.faturado === true).length})
                </button>
            </div>

            {/* Search */}
            <div className="p-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou carga..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-4 text-black focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3 pb-20">
                {loading ? (
                    <p className="text-center text-gray-500 mt-10">Carregando...</p>
                ) : filtered.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhum registro encontrado.</p>
                    </div>
                ) : (
                    filtered.map(conf => {
                        const isFaturado = conf.faturado === true;
                        const faturadoClasses = isFaturado ? 'border-l-4 border-l-green-500 bg-green-50/20' : '';

                        return (
                            <div
                                key={conf.id}
                                onClick={() => activeTab !== 'IN_PROGRESS' && onSelectConference(conf.id)}
                                className={`bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 transition group relative ${activeTab !== 'IN_PROGRESS' ? 'cursor-pointer hover:border-[var(--primary)] hover:shadow-md' : 'opacity-80'} ${faturadoClasses}`}
                            >

                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-black group-hover:text-[var(--primary)] transition">
                                            {conf.cliente_nome}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Package size={12} />
                                            <span>{conf.carga_nome}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        {activeTab === 'IN_PROGRESS' ? (
                                            <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                <Clock size={10} /> Em Andamento
                                            </span>
                                        ) : (
                                            ((conf.resumo?.missing || 0) === 0 && (conf.resumo?.excess || 0) === 0 && (conf.resumo?.extra || 0) === 0) ? (
                                                <span className="bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                    <CheckCircle size={10} /> Perfeita
                                                </span>
                                            ) : (
                                                <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Ressalvas
                                                </span>
                                            )
                                        )}

                                        {/* Faturado Badge */}
                                        {isFaturado && (
                                            <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                FATURADO
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-[var(--border-color)] pt-3 mt-2">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(conf.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(conf.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {activeTab !== 'IN_PROGRESS' && (
                                        <div className="flex items-center gap-1 text-[var(--primary)] font-bold">
                                            Ver Relatório <ArrowLeft className="rotate-180 w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
