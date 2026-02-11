
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, CheckCircle, AlertTriangle, AlertCircle, Package, User, Calendar, Download, ChevronDown, ChevronUp, Receipt } from 'lucide-react';

interface ConferenceReportScreenProps {
    conferenceId: string;
    onBack: () => void;
}

export const ConferenceReportScreen = ({ conferenceId, onBack }: ConferenceReportScreenProps) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showMatches, setShowMatches] = useState(false);
    const [faturado, setFaturado] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

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
            setFaturado(res.faturado || false);
        } catch (err) {
            console.error("Erro ao carregar relatório:", err);
            alert("Erro ao carregar relatório. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleInvoice = async () => {
        try {
            setInvoiceLoading(true);
            const newStatus = !faturado;
            await api.toggleInvoice(conferenceId, newStatus);
            setFaturado(newStatus);
            alert(newStatus ? 'Marcada como FATURADA' : 'Faturamento removido');
        } catch (err: any) {
            alert(err.message || 'Erro ao atualizar status');
        } finally {
            setInvoiceLoading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center text-black">Carregando relatório...</div>;
    if (!data) return <div className="flex h-full items-center justify-center text-black">Relatório não encontrado.</div>;

    const snapshot = Array.isArray(data.report_snapshot) ? data.report_snapshot : [];

    // Categorize items safely
    const missing = snapshot.filter((i: any) => i?.type === 'MISSING') || [];
    const excess = snapshot.filter((i: any) => i?.type === 'EXCESS') || [];
    const extra = snapshot.filter((i: any) => i?.type === 'EXTRA') || [];
    const match = snapshot.filter((i: any) => i?.type === 'MATCH') || [];

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
                {faturado && (
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        FATURADO
                    </div>
                )}
                <button
                    onClick={handleToggleInvoice}
                    disabled={invoiceLoading}
                    className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg"
                    title={faturado ? "Remover Faturamento" : "Marcar como Faturado"}
                >
                    <Receipt size={20} />
                </button>
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

                {/* Reservation Notes */}
                {data.resumo?.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800 mb-6">
                        <strong className="block mb-1 font-bold">Ressalvas/Observações:</strong>
                        {data.resumo.notes}
                    </div>
                )}

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



                {/* Matched Items Section */}
                {match.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mt-6">
                        <button
                            onClick={() => setShowMatches(!showMatches)}
                            className="flex items-center justify-between w-full bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition"
                        >
                            <span className="font-bold text-gray-700 flex items-center gap-2">
                                <CheckCircle size={18} className="text-green-600" />
                                Itens Conferidos ({match.length})
                            </span>
                            {showMatches ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                        </button>

                        {showMatches && (
                            <div className="mt-2 space-y-2 animate-fade-in">
                                {match.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center shadow-sm">
                                        <div>
                                            <p className="text-sm font-medium text-black">{item.nome}</p>
                                            <div className="flex gap-2 text-xs text-gray-500">
                                                <span>Qtd: {item.scanned}</span>
                                                {item.locations && item.locations.length > 0 && (
                                                    <span className="font-mono text-[var(--primary)]">
                                                        Vol: {item.locations.map((l: any) => `V${l}`).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-100 text-green-600 flex items-center gap-1">
                                            <CheckCircle size={10} /> OK
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};
