'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Package, Plus, X, Trash2, Lock, Unlock, CheckCircle,
    AlertTriangle, ScanBarcode
} from 'lucide-react';

interface VolumeData {
    id: string;
    numero_sequencial: number;
    is_open: boolean;
    items: VolumeItemData[];
    item_count: number;
}

interface VolumeItemData {
    id: string;
    produto_ean: string;
    produto_referencia: string;
    quantidade: number;
    created_at: string;
}

interface ExpectedItem {
    referencia: string;
    nome: string;
    quantidadeEsperada: number;
    unidade: string;
}

export default function ConferenciaPage() {
    const router = useRouter();
    const params = useParams();
    const cargaId = params.cargaId as string;
    const clienteId = params.clienteId as string;

    const [volumes, setVolumes] = useState<VolumeData[]>([]);
    const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
    const [clientName, setClientName] = useState('');
    const [loading, setLoading] = useState(true);
    const [barcode, setBarcode] = useState('');
    const [scanFeedback, setScanFeedback] = useState<{ type: string; message: string } | null>(null);
    const barcodeRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        try {
            const [volRes, clientRes] = await Promise.all([
                fetch(`/api/clients/${clienteId}/volumes?cargaId=${cargaId}`),
                fetch(`/api/cargas/${cargaId}/clients`),
            ]);

            const volData = await volRes.json();
            setVolumes(volData);

            const clientData = await clientRes.json();
            const cli = clientData.clients?.find((c: { id: string }) => c.id === clienteId);
            if (cli) {
                setClientName(cli.name);
                setExpectedItems(cli.items || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [cargaId, clienteId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Focus barcode input
    useEffect(() => {
        barcodeRef.current?.focus();
    }, [volumes]);

    const openVolume = volumes.find((v) => v.is_open);

    async function handleNewVolume() {
        try {
            const res = await fetch('/api/volumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargaId, clienteId }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error);
                return;
            }
            loadData();
        } catch (err) {
            console.error(err);
        }
    }

    async function handleCloseVolume(volumeId: string) {
        if (!confirm('Fechar este volume?')) return;
        await fetch(`/api/volumes/${volumeId}/close`, { method: 'POST' });
        loadData();
    }

    async function handleReopenVolume(volumeId: string) {
        const res = await fetch(`/api/volumes/${volumeId}/reopen`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error);
            return;
        }
        loadData();
    }

    async function handleDeleteVolume(volumeId: string) {
        if (!confirm('Excluir este volume e todos os seus itens?')) return;
        await fetch(`/api/volumes/${volumeId}`, { method: 'DELETE' });
        loadData();
    }

    async function handleScan(e: React.FormEvent) {
        e.preventDefault();
        if (!barcode.trim() || !openVolume) return;

        setScanFeedback(null);

        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volumeId: openVolume.id, barcode: barcode.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setScanFeedback({
                    type: 'error',
                    message: data.error || 'Erro ao bipar',
                });
                // Play error sound
                try { new Audio('/error.mp3').play(); } catch { /* ignore */ }
            } else {
                const msg = data.isExtra
                    ? `⚠️ FORA DO PEDIDO: ${data.item.referencia} - ${data.item.nome}`
                    : `✅ ${data.item.referencia} - ${data.item.nome}`;

                setScanFeedback({
                    type: data.warning ? 'warning' : data.isExtra ? 'extra' : 'success',
                    message: data.warning ? data.warning.message : msg,
                });

                // Play success sound
                try { new Audio('/beep.mp3').play(); } catch { /* ignore */ }
                loadData();
            }
        } catch (err) {
            console.error(err);
            setScanFeedback({ type: 'error', message: 'Erro de conexão' });
        }

        setBarcode('');
        barcodeRef.current?.focus();
    }

    async function handleRemoveItem(itemId: string) {
        if (!confirm('Remover este item?')) return;
        await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
        loadData();
    }

    async function handleFinalize() {
        if (!confirm('Finalizar conferência deste cliente? Esta ação gerará o relatório.')) return;

        // Calculate summary
        const totalScanned = volumes.reduce(
            (acc, v) => acc + v.items.reduce((a, i) => a + Number(i.quantidade), 0),
            0
        );
        const totalExpected = expectedItems.reduce((a, i) => a + i.quantidadeEsperada, 0);

        // Build scanned map
        const scannedMap: Record<string, number> = {};
        volumes.forEach((v) =>
            v.items.forEach((i) => {
                scannedMap[i.produto_referencia] = (scannedMap[i.produto_referencia] || 0) + Number(i.quantidade);
            })
        );

        let missing = 0;
        let excess = 0;
        let extra = 0;

        const details: Array<{ ref: string; nome: string; expected: number; scanned: number; diff: number; status: string }> = [];

        expectedItems.forEach((item) => {
            const scanned = scannedMap[item.referencia] || 0;
            const diff = scanned - item.quantidadeEsperada;
            let status = 'OK';

            if (diff < 0) { missing += Math.abs(diff); status = 'FALTANDO'; }
            else if (diff > 0) { excess += diff; status = 'EXCEDENTE'; }

            details.push({
                ref: item.referencia,
                nome: item.nome,
                expected: item.quantidadeEsperada,
                scanned,
                diff,
                status,
            });
            delete scannedMap[item.referencia];
        });

        // Extra items (not in expected list)
        Object.entries(scannedMap).forEach(([ref, qty]) => {
            extra += qty;
            details.push({ ref, nome: '', expected: 0, scanned: qty, diff: qty, status: 'EXTRA' });
        });

        const resumo = { totalExpected, totalScanned, missing, excess, extra };

        const reportSnapshot = {
            clienteId,
            clienteName: clientName,
            cargaId,
            resumo,
            details,
            volumes: volumes.map((v) => ({
                id: v.id,
                seq: v.numero_sequencial,
                itemCount: v.item_count,
            })),
            generatedAt: new Date().toISOString(),
        };

        try {
            const res = await fetch('/api/conferencias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargaId, clienteId, resumo, reportSnapshot }),
            });

            const data = await res.json();
            if (res.ok) {
                alert('✅ Conferência finalizada com sucesso!');
                router.push(`/relatorios/${data.id}`);
            } else {
                alert('Erro: ' + (data.error || 'Falha ao finalizar'));
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao finalizar conferência');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">{clientName || clienteId}</h1>
                    <p className="text-xs text-gray-500">Conferência de Carga</p>
                </div>
            </div>

            {/* Scan Input */}
            <div className="card">
                <form onSubmit={handleScan} className="flex gap-2">
                    <div className="relative flex-1">
                        <ScanBarcode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={barcodeRef}
                            type="text"
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            placeholder={openVolume ? 'Bipe o código de barras...' : 'Abra um volume primeiro'}
                            disabled={!openVolume}
                            className="input-field pl-10 font-mono"
                            autoComplete="off"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!openVolume || !barcode.trim()}
                        className="btn-primary disabled:opacity-50"
                    >
                        Bipar
                    </button>
                </form>

                {/* Feedback */}
                {scanFeedback && (
                    <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${scanFeedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                        scanFeedback.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            scanFeedback.type === 'extra' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {scanFeedback.message}
                    </div>
                )}
            </div>

            {/* Volume Controls */}
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                    Volumes ({volumes.length})
                </h2>
                <button onClick={handleNewVolume} className="btn-primary text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Novo Volume
                </button>
            </div>

            {/* Volumes List */}
            {volumes.length === 0 ? (
                <div className="card text-center py-8">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhum volume criado</p>
                    <p className="text-gray-400 text-xs">Clique em &quot;Novo Volume&quot; para começar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {volumes.map((vol) => (
                        <div key={vol.id} className={`card ${vol.is_open ? 'border-primary/30 bg-primary/5' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {vol.is_open ? (
                                        <Unlock className="w-4 h-4 text-primary" />
                                    ) : (
                                        <Lock className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className="font-medium text-sm">
                                        Volume {vol.numero_sequencial}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({vol.items?.length || 0} itens)
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {vol.is_open ? (
                                        <button
                                            onClick={() => handleCloseVolume(vol.id)}
                                            className="p-1.5 text-gray-400 hover:text-amber-600 rounded"
                                            title="Fechar volume"
                                        >
                                            <Lock className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReopenVolume(vol.id)}
                                            className="p-1.5 text-gray-400 hover:text-primary rounded"
                                            title="Reabrir volume"
                                        >
                                            <Unlock className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteVolume(vol.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                        title="Excluir volume"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Volume Items */}
                            {vol.items && vol.items.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {vol.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                                            <div>
                                                <span className="font-mono text-gray-600">{item.produto_referencia}</span>
                                                <span className="mx-1 text-gray-300">•</span>
                                                <span className="text-gray-500">EAN: {item.produto_ean}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">×{item.quantidade}</span>
                                                {vol.is_open && (
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="text-red-400 hover:text-red-600"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Summary & Finalize */}
            {volumes.length > 0 && (
                <div className="card bg-gray-50">
                    <h3 className="font-semibold text-sm text-gray-900 mb-2">Resumo</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">Esperado:</span>{' '}
                            <span className="font-medium">
                                {expectedItems.reduce((a, i) => a + i.quantidadeEsperada, 0)}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Bipado:</span>{' '}
                            <span className="font-medium">
                                {volumes.reduce(
                                    (acc, v) => acc + (v.items?.reduce((a, i) => a + Number(i.quantidade), 0) || 0),
                                    0
                                )}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleFinalize}
                        className="btn-success w-full mt-4 flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Finalizar Conferência
                    </button>
                </div>
            )}
        </div>
    );
}
