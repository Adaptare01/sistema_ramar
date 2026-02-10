
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, CheckCircle, AlertTriangle, AlertCircle, Package, User, Calendar, Download } from 'lucide-react';

interface ConferenceReportScreenProps {
    conferenceId: string;
    onBack: () => void;
}

export const ConferenceReportScreen = ({ conferenceId, onBack }: ConferenceReportScreenProps) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, [conferenceId]);

    const loadReport = async () => {
        console.log("Loading report for:", conferenceId);
        try {
            setLoading(true);
            const res = await api.getConferenceDetails(conferenceId);
            console.log("Report data received:", res);
            if (!res) throw new Error("Dados vazios recebidos da API");
            setData(res);
        } catch (err) {
            console.error("Erro ao carregar relatório:", err);
            alert("Erro ao carregar relatório. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center text-black">Carregando relatório...</div>;
    if (!data) return <div className="flex h-full items-center justify-center text-black">Relatório não encontrado.</div>;

    const snapshot = Array.isArray(data.report_snapshot) ? data.report_snapshot : [];

    // Categorize items safely
    const missing = snapshot.filter((i: any) => i?.type === 'MISSING') || [];
    const excess = snapshot.filter((i: any) => i?.type === 'EXCESS') || [];
    const extra = snapshot.filter((i: any) => i?.type === 'EXTRA') || [];

    const summary = data.resumo || {};
    const createdDate = data.created_at ? new Date(data.created_at) : new Date();

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-black">
            {/* Header */}
            <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-color)] flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 transition">
                    <ArrowLeft className="w-6 h-6 text-black" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-black leading-tight">Relatório de Conferência</h1>
                    <p className="text-xs text-gray-500 font-mono">ID: {(conferenceId || '').split('-')[0]}...</p>
                </div>
                <button className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg" title="Exportar PDF (Futuro)">
                    <Download size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Info Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Cliente</p>
                            <p className="font-bold text-black">{data.cliente_nome || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Carga</p>
                            <p className="font-bold text-black">{data.carga_nome || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Data Finalização</p>
                            <p className="font-bold text-black">{createdDate.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`text-center p-3 rounded-lg font-bold border ${extra.length + missing.length + excess.length === 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                    {extra.length + missing.length + excess.length === 0
                        ? "CONFERÊNCIA PERFEITA"
                        : "FINALIZADA COM RESSALVAS"
                    }
                </div>

                {/* Discrepancies */}

                {missing.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-red-600 uppercase flex items-center gap-2">
                            <AlertTriangle size={16} /> Itens Faltantes ({missing.length})
                        </h3>
                        {missing.map((item: any, idx: number) => (
                            <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-red-900">{item.nome}</span>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-red-200 text-red-600">
                                    Faltou {Math.abs(item.diff)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {excess.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-orange-600 uppercase flex items-center gap-2">
                            <AlertCircle size={16} /> Excesso ({excess.length})
                        </h3>
                        {excess.map((item: any, idx: number) => (
                            <div key={idx} className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-orange-900">{item.nome}</span>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-orange-200 text-orange-600">
                                    Sobrou {item.diff}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {extra.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-purple-600 uppercase flex items-center gap-2">
                            <AlertCircle size={16} /> Itens Extras (Fora do Pedido) ({extra.length})
                        </h3>
                        {extra.map((item: any, idx: number) => (
                            <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-purple-900">{item.nome}</span>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-purple-200 text-purple-600">
                                    {item.diff} UN
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {extra.length === 0 && missing.length === 0 && excess.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle size={48} className="mx-auto mb-2 text-green-500 opacity-50" />
                        <p>Nenhuma divergência encontrada.</p>
                    </div>
                )}

            </div>
        </div>
    );
};
