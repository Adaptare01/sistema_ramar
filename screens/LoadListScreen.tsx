import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { FileText, Calendar, Package, ArrowRight, Clock, CheckCircle } from 'lucide-react';

interface Load {
    id: string;
    nome_arquivo: string;
    status: string;
    total_itens: number;
    data_importacao: string;
    volumes_count: number;
    items_scanned: number;
}

interface LoadListScreenProps {
    onSelect: (cargaId: string) => void;
}

export const LoadListScreen = ({ onSelect }: LoadListScreenProps) => {
    const [loads, setLoads] = useState<Load[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getCargas();
            setLoads(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 animate-fade-in">
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
                Minhas Cargas
            </h1>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Carregando cargas...</div>
            ) : loads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Nenhuma carga importada ainda.</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {loads.map(load => {
                        const progress = load.total_itens > 0
                            ? Math.round((load.items_scanned / load.total_itens) * 100)
                            : 0;

                        return (
                            <Card key={load.id} className="hover:border-[var(--primary)]/50 transition cursor-pointer group" onClick={() => onSelect(load.id)}>
                                <div className="flex justify-between items-start mb-4 gap-4">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="p-3 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition truncate">{load.nome_arquivo}</h3>
                                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-1">
                                                <Calendar size={12} />
                                                <span>{formatDate(load.data_importacao)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${progress === 100
                                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                        }`}>
                                        {progress === 100 ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1"><Package size={12} /> Volumes</p>
                                        <p className="text-lg font-bold text-[var(--text-main)]">{load.volumes_count}</p>
                                    </div>
                                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                                        <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1"><CheckCircle size={12} /> Progresso</p>
                                        <p className="text-lg font-bold text-[var(--text-main)]">{progress}%</p>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-[var(--primary)]'} transition-all duration-500`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-xs text-[var(--primary)] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        CONTINUAR CONFERÊNCIA <ArrowRight size={14} />
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
