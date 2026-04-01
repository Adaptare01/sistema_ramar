'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertTriangle, Printer, Filter } from 'lucide-react';

interface VolumeItemDetail {
    volumeSeq: number;
    quantidade: number;
}

interface ReportDetail {
    ref: string;
    nome: string;
    expected: number;
    scanned: number;
    diff: number;
    status: string;
    volumeItems?: VolumeItemDetail[];
}

interface ReportData {
    id: string;
    carga_nome: string;
    cliente_nome: string;
    resumo: { totalExpected: number; totalScanned: number; missing: number; excess: number; extra: number };
    report_snapshot: {
        details: ReportDetail[];
        volumes: { id: string; seq: number; itemCount: number }[];
        generatedAt: string;
    };
    observacoes: string | null;
    faturado: boolean;
    created_at: string;
    finalizado_em: string | null;
    faturado_em: string | null;
}

interface DisplayRow {
    ref: string;
    nome: string;
    expected: number;
    conferido: number;
    diff: number;
    status: string;
    volumeSeq: number | null;
    isLastForProduct: boolean;
}

export default function ReportDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVolume, setSelectedVolume] = useState<number | null>(null);

    useEffect(() => {
        fetch(`/api/conferencias/${id}`)
            .then((r) => r.json())
            .then(setReport)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    // Expand details into display rows (one row per product×volume)
    const displayRows = useMemo(() => {
        if (!report?.report_snapshot?.details) return [];

        const rows: DisplayRow[] = [];

        for (const item of report.report_snapshot.details) {
            const vItems = item.volumeItems || [];

            if (vItems.length === 0) {
                // FALTANDO — no volume, single row
                rows.push({
                    ref: item.ref,
                    nome: item.nome,
                    expected: item.expected,
                    conferido: 0,
                    diff: item.diff,
                    status: item.status,
                    volumeSeq: null,
                    isLastForProduct: true,
                });
            } else if (vItems.length === 1) {
                // Single volume — single row
                rows.push({
                    ref: item.ref,
                    nome: item.nome,
                    expected: item.expected,
                    conferido: vItems[0].quantidade,
                    diff: item.diff,
                    status: item.status,
                    volumeSeq: vItems[0].volumeSeq,
                    isLastForProduct: true,
                });
            } else {
                // Multiple volumes — one row per volume
                vItems.forEach((vi, idx) => {
                    const isLast = idx === vItems.length - 1;
                    rows.push({
                        ref: item.ref,
                        nome: item.nome,
                        expected: item.expected,
                        conferido: vi.quantidade,
                        diff: isLast ? item.diff : 0,
                        status: isLast ? item.status : '',
                        volumeSeq: vi.volumeSeq,
                        isLastForProduct: isLast,
                    });
                });
            }
        }

        return rows;
    }, [report]);

    // Filter rows by selected volume
    const filteredRows = useMemo(() => {
        if (selectedVolume === null) return displayRows;
        return displayRows.filter((r) => r.volumeSeq === selectedVolume);
    }, [displayRows, selectedVolume]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="card text-center py-12">
                <p className="text-gray-500">Relatório não encontrado</p>
            </div>
        );
    }

    const snapshot = report.report_snapshot;
    const resumo = report.resumo;
    const volumeSeqs = snapshot?.volumes?.map((v) => v.seq).sort((a, b) => a - b) || [];

    return (
        <div className="space-y-4 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/relatorios')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{report.cliente_nome}</h1>
                        <p className="text-xs text-gray-500">{report.carga_nome}</p>
                    </div>
                </div>
                <button onClick={() => window.print()} className="p-2 text-gray-400 hover:text-primary rounded-lg" title="Imprimir">
                    <Printer className="w-5 h-5" />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <SummaryCard label="Esperado" value={resumo.totalExpected} color="blue" />
                <SummaryCard label="Conferido" value={resumo.totalScanned} color="green" />
                <SummaryCard label="Faltando" value={resumo.missing} color="red" />
                <SummaryCard label="Excedente" value={resumo.excess} color="amber" />
                <SummaryCard label="Fora do Pedido" value={resumo.extra} color="orange" />
            </div>

            {/* Status Banner */}
            {resumo.missing === 0 && resumo.excess === 0 && resumo.extra === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                        <p className="font-medium text-green-800">Conferência OK</p>
                        <p className="text-sm text-green-600">Todos os itens conferidos corretamente</p>
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    <div>
                        <p className="font-medium text-amber-800">Conferência com Ressalvas</p>
                        <p className="text-sm text-amber-600">
                            {resumo.missing > 0 && `${resumo.missing} faltando `}
                            {resumo.excess > 0 && `${resumo.excess} excedente `}
                            {resumo.extra > 0 && `${resumo.extra} fora do pedido`}
                        </p>
                    </div>
                </div>
            )}

            {/* Observações */}
            {report.observacoes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 text-sm mb-1">📝 Observações do Operador</h3>
                    <p className="text-sm text-blue-700 whitespace-pre-wrap">{report.observacoes}</p>
                </div>
            )}

            {/* Volumes Summary */}
            {snapshot?.volumes && snapshot.volumes.length > 0 && (
                <div className="card">
                    <h2 className="font-semibold text-gray-900 mb-2">Volumes ({snapshot.volumes.length})</h2>
                    <div className="flex flex-wrap gap-2">
                        {snapshot.volumes.map((v) => (
                            <span key={v.id} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                                Vol. {v.seq} ({v.itemCount} itens)
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Details Table */}
            <div className="card overflow-hidden p-0">
                {/* Filter + Title */}
                <div className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="font-semibold text-gray-900">Detalhamento</h2>
                    {volumeSeqs.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <button
                                onClick={() => setSelectedVolume(null)}
                                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selectedVolume === null
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {volumeSeqs.map((seq) => (
                                <button
                                    key={seq}
                                    onClick={() => setSelectedVolume(seq)}
                                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selectedVolume === seq
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    Vol. {seq}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                                <th className="px-4 py-2">Referência</th>
                                <th className="px-4 py-2">Produto</th>
                                <th className="px-4 py-2 text-right">Esperado</th>
                                <th className="px-4 py-2 text-right">Conferido</th>
                                <th className="px-4 py-2 text-right">Diferença</th>
                                <th className="px-4 py-2 text-center">Volume</th>
                                <th className="px-4 py-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRows.map((row, i) => (
                                <tr key={i} className={`hover:bg-gray-50 ${!row.isLastForProduct ? 'border-b-0' : ''}`}>
                                    <td className="px-4 py-2 font-mono text-xs">{row.ref}</td>
                                    <td className="px-4 py-2 text-gray-700 truncate max-w-[200px]">{row.nome}</td>
                                    <td className="px-4 py-2 text-right">{row.expected}</td>
                                    <td className="px-4 py-2 text-right font-medium">{row.conferido}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${!row.isLastForProduct ? 'text-gray-300' : row.diff < 0 ? 'text-red-600' : row.diff > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                        {!row.isLastForProduct ? '' : row.diff > 0 ? `+${row.diff}` : row.diff === 0 ? '-' : row.diff}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {row.volumeSeq ? (
                                            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                                Vol. {row.volumeSeq}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {row.isLastForProduct && row.status ? (
                                            <StatusBadge status={row.status} />
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                        Nenhum item {selectedVolume ? `no Volume ${selectedVolume}` : ''}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Info */}
            <p className="text-xs text-gray-400 text-center">
                Relatório gerado em {snapshot?.generatedAt ? new Date(snapshot.generatedAt).toLocaleString('pt-BR') : '-'}
            </p>
        </div>
    );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700',
        green: 'bg-green-50 text-green-700',
        red: 'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
        orange: 'bg-orange-50 text-orange-700',
    };

    return (
        <div className={`rounded-xl p-3 ${colors[color]}`}>
            <p className="text-xs opacity-75">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        OK: 'bg-green-100 text-green-700',
        FALTANDO: 'bg-red-100 text-red-700',
        EXCEDENTE: 'bg-amber-100 text-amber-700',
        EXTRA: 'bg-orange-100 text-orange-700',
    };

    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
}
