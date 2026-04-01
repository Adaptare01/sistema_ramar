'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Package, Plus, X, Trash2, Lock, Unlock, CheckCircle,
    AlertTriangle, ScanBarcode, Camera
} from 'lucide-react';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

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
    produto_nome: string;
    quantidade: number;
    created_at: string;
}

interface ExpectedItem {
    referencia: string;
    nome: string;
    quantidadeEsperada: number;
    unidade: string;
}

interface PendingScan {
    barcode: string;
    product: { referencia: string; nome: string; ean: string };
    isExtra: boolean;
    step: 'extra_confirm' | 'quantity';
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
    const [showScanner, setShowScanner] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    // 2-step scan state
    const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
    const [pendingQty, setPendingQty] = useState('1');

    // Finalize modal state
    const [finalizeData, setFinalizeData] = useState<{
        resumo: { totalExpected: number; totalScanned: number; missing: number; excess: number; extra: number };
        reportSnapshot: Record<string, unknown>;
        hasIssues: boolean;
    } | null>(null);
    const [observacoes, setObservacoes] = useState('');

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

    useEffect(() => {
        if (!pendingScan) barcodeRef.current?.focus();
    }, [volumes, pendingScan]);

    const openVolume = volumes.find((v) => v.is_open);

    // ─── Step 1: Lookup product (no insert) ───
    async function handleScan(e: React.FormEvent) {
        e.preventDefault();
        if (!barcode.trim() || !openVolume) return;
        await doLookup(barcode.trim());
    }

    async function handleCameraScan(code: string) {
        setShowScanner(false);
        if (!code.trim() || !openVolume) return;
        await doLookup(code.trim());
    }

    async function doLookup(code: string) {
        setScanFeedback(null);
        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volumeId: openVolume!.id, barcode: code }),
            });
            const data = await res.json();

            if (!res.ok) {
                setScanFeedback({ type: 'error', message: data.error || 'Erro ao bipar' });
                try { new Audio('/error.mp3').play(); } catch { /* ignore */ }
                setBarcode('');
                barcodeRef.current?.focus();
                return;
            }

            // Product found — decide next step
            if (data.isExtra) {
                // Show FORA DO PEDIDO confirmation popup
                setPendingScan({
                    barcode: code,
                    product: data.product,
                    isExtra: true,
                    step: 'extra_confirm',
                });
            } else {
                // Go directly to quantity modal
                setPendingScan({
                    barcode: code,
                    product: data.product,
                    isExtra: false,
                    step: 'quantity',
                });
                setPendingQty('1');
            }
            setBarcode('');
        } catch (err) {
            console.error(err);
            setScanFeedback({ type: 'error', message: 'Erro de conexão' });
            setBarcode('');
        }
    }

    // ─── Step 2a: User confirms extra item → go to quantity ───
    function handleConfirmExtra() {
        if (!pendingScan) return;
        setPendingScan({ ...pendingScan, step: 'quantity' });
        setPendingQty('1');
    }

    // ─── Step 2b: Cancel extra → discard ───
    function handleCancelScan() {
        setPendingScan(null);
        setPendingQty('1');
        barcodeRef.current?.focus();
    }

    // ─── Step 3: Confirm quantity → insert ───
    async function handleConfirmQuantity() {
        if (!pendingScan || !openVolume) return;
        const qty = parseInt(pendingQty) || 1;

        try {
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    volumeId: openVolume.id,
                    barcode: pendingScan.barcode,
                    quantity: qty,
                    forceInsert: pendingScan.isExtra,
                }),
            });
            const data = await res.json();

            if (data.success) {
                const label = pendingScan.isExtra ? '⚠️ RESSALVA' : '✅';
                setScanFeedback({
                    type: pendingScan.isExtra ? 'extra' : data.warning ? 'warning' : 'success',
                    message: data.warning
                        ? data.warning.message
                        : `${label}: ${data.item.referencia} - ${data.item.nome} (×${qty})`,
                });
                try { new Audio('/beep.mp3').play(); } catch { /* ignore */ }
                loadData();
            } else {
                setScanFeedback({ type: 'error', message: data.error || 'Erro ao inserir' });
            }
        } catch (err) {
            console.error(err);
            setScanFeedback({ type: 'error', message: 'Erro de conexão' });
        }

        setPendingScan(null);
        setPendingQty('1');
        barcodeRef.current?.focus();
    }

    // ─── Volume management ───
    async function handleNewVolume() {
        try {
            const res = await fetch('/api/volumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargaId, clienteId }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 423) {
                    alert(`🔒 ${data.error}`);
                } else {
                    alert(data.error);
                }
                return;
            }
            loadData();
        } catch (err) { console.error(err); }
    }

    async function handleCloseVolume(volumeId: string) {
        if (!confirm('Fechar este volume?')) return;
        await fetch(`/api/volumes/${volumeId}/close`, { method: 'POST' });
        loadData();
    }

    async function handleReopenVolume(volumeId: string) {
        const res = await fetch(`/api/volumes/${volumeId}/reopen`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) { alert(data.error); return; }
        loadData();
    }

    async function handleDeleteVolume(volumeId: string) {
        if (!confirm('Excluir este volume e todos os seus itens?')) return;
        await fetch(`/api/volumes/${volumeId}`, { method: 'DELETE' });
        loadData();
    }

    async function handleRemoveItem(itemId: string) {
        if (!confirm('Remover este item?')) return;
        await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
        loadData();
    }

    // ─── Finalize ───
    async function handleFinalize() {
        if (!confirm('Finalizar conferência deste cliente? Esta ação gerará o relatório.')) return;

        const totalScanned = volumes.reduce(
            (acc, v) => acc + v.items.reduce((a, i) => a + Number(i.quantidade), 0), 0
        );
        const totalExpected = expectedItems.reduce((a, i) => a + i.quantidadeEsperada, 0);

        // Build per-product scanned totals AND per-volume breakdown
        const scannedMap: Record<string, number> = {};
        const refToVolumeItems: Record<string, { volumeSeq: number; quantidade: number }[]> = {};

        volumes.forEach((v) =>
            v.items.forEach((i) => {
                const ref = i.produto_referencia;
                scannedMap[ref] = (scannedMap[ref] || 0) + Number(i.quantidade);

                if (!refToVolumeItems[ref]) refToVolumeItems[ref] = [];
                const existing = refToVolumeItems[ref].find(x => x.volumeSeq === v.numero_sequencial);
                if (existing) {
                    existing.quantidade += Number(i.quantidade);
                } else {
                    refToVolumeItems[ref].push({ volumeSeq: v.numero_sequencial, quantidade: Number(i.quantidade) });
                }
            })
        );

        let missing = 0, excess = 0, extra = 0;
        const details: Array<{
            ref: string; nome: string; expected: number; scanned: number; diff: number; status: string;
            volumeItems: { volumeSeq: number; quantidade: number }[];
        }> = [];

        expectedItems.forEach((item) => {
            const scanned = scannedMap[item.referencia] || 0;
            const diff = scanned - item.quantidadeEsperada;
            let status = 'OK';
            if (diff < 0) { missing += Math.abs(diff); status = 'FALTANDO'; }
            else if (diff > 0) { excess += diff; status = 'EXCEDENTE'; }
            details.push({
                ref: item.referencia, nome: item.nome, expected: item.quantidadeEsperada,
                scanned, diff, status,
                volumeItems: refToVolumeItems[item.referencia] || [],
            });
            delete scannedMap[item.referencia];
        });

        Object.entries(scannedMap).forEach(([ref, qty]) => {
            extra += qty;
            const itemName = volumes.flatMap(v => v.items).find(i => i.produto_referencia === ref)?.produto_nome || '';
            details.push({
                ref, nome: itemName, expected: 0, scanned: qty, diff: qty, status: 'EXTRA',
                volumeItems: refToVolumeItems[ref] || [],
            });
        });

        const resumo = { totalExpected, totalScanned, missing, excess, extra };
        const reportSnapshot = {
            clienteId, clienteName: clientName, cargaId, resumo, details,
            volumes: volumes.map((v) => ({ id: v.id, seq: v.numero_sequencial, itemCount: v.item_count })),
            generatedAt: new Date().toISOString(),
        };

        const hasIssues = missing > 0 || excess > 0 || extra > 0;

        if (hasIssues) {
            // Show observações modal
            setFinalizeData({ resumo, reportSnapshot, hasIssues });
            setObservacoes('');
            return;
        }

        // No issues → finalize directly
        await doFinalize(resumo, reportSnapshot, '');
    }

    async function doFinalize(
        resumo: { totalExpected: number; totalScanned: number; missing: number; excess: number; extra: number },
        reportSnapshot: Record<string, unknown>,
        obs: string,
    ) {
        try {
            const res = await fetch('/api/conferencias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cargaId, clienteId, resumo, reportSnapshot, observacoes: obs || null }),
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
        setFinalizeData(null);
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
                            disabled={!openVolume || !!pendingScan}
                            className="input-field pl-10 font-mono"
                            autoComplete="off"
                        />
                    </div>
                    <button
                        type="button"
                        disabled={!openVolume || !!pendingScan}
                        onClick={() => setShowScanner(true)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                        title="Abrir câmera"
                    >
                        <Camera className="w-5 h-5" />
                    </button>
                    <button
                        type="submit"
                        disabled={!openVolume || !barcode.trim() || !!pendingScan}
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

            {/* ════════════ MODAL: FORA DO PEDIDO ════════════ */}
            {pendingScan?.step === 'extra_confirm' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-600">
                            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                            <h2 className="text-lg font-bold">Item fora do pedido</h2>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                            <p className="font-mono text-sm font-bold">{pendingScan.product.referencia}</p>
                            <p className="text-sm text-gray-700 mt-1">{pendingScan.product.nome}</p>
                        </div>
                        <p className="text-sm text-gray-600">
                            Este item <strong>não pertence ao pedido</strong> deste cliente. Deseja incluir mesmo assim?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelScan}
                                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                NÃO
                            </button>
                            <button
                                onClick={handleConfirmExtra}
                                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                            >
                                SIM, Incluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════ MODAL: QUANTIDADE ════════════ */}
            {pendingScan?.step === 'quantity' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900">Quantidade</h2>
                        <div className={`rounded-lg p-3 ${pendingScan.isExtra ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                            <p className="font-mono text-sm font-bold">{pendingScan.product.referencia}</p>
                            <p className="text-sm text-gray-700 mt-1">{pendingScan.product.nome}</p>
                            {pendingScan.isExtra && (
                                <p className="text-xs text-amber-600 font-semibold mt-1">⚠️ FORA DO PEDIDO (Ressalva)</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm text-gray-600 block mb-1">Quantidade neste volume:</label>
                            <input
                                type="number"
                                min="1"
                                value={pendingQty}
                                onChange={(e) => setPendingQty(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmQuantity(); }}
                                className="input-field text-center text-2xl font-bold w-full"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelScan}
                                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmQuantity}
                                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                            >
                                ✓ Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Volume Controls */}
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Volumes ({volumes.length})</h2>
                <button onClick={handleNewVolume} className="btn-primary text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Novo Volume
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
                                    {vol.is_open ? <Unlock className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-gray-400" />}
                                    <span className="font-medium text-sm">Volume {vol.numero_sequencial}</span>
                                    <span className="text-xs text-gray-500">({vol.items?.length || 0} itens)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {vol.is_open ? (
                                        <button onClick={() => handleCloseVolume(vol.id)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Fechar volume">
                                            <Lock className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleReopenVolume(vol.id)} className="p-1.5 text-gray-400 hover:text-primary rounded" title="Reabrir volume">
                                            <Unlock className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteVolume(vol.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Excluir volume">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Volume Items — show REF - NOME instead of EAN */}
                            {vol.items && vol.items.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {vol.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-mono text-gray-600 font-medium">{item.produto_referencia}</span>
                                                <span className="mx-1 text-gray-300">-</span>
                                                <span className="text-gray-600 truncate">{item.produto_nome || `EAN: ${item.produto_ean}`}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <span className="font-medium">×{item.quantidade}</span>
                                                {vol.is_open && (
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600">
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
                            <span className="font-medium">{expectedItems.reduce((a, i) => a + i.quantidadeEsperada, 0)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Bipado:</span>{' '}
                            <span className="font-medium">
                                {volumes.reduce((acc, v) => acc + (v.items?.reduce((a, i) => a + Number(i.quantidade), 0) || 0), 0)}
                            </span>
                        </div>
                    </div>
                    <button onClick={handleFinalize} className="btn-success w-full mt-4 flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Finalizar Conferência
                    </button>
                </div>
            )}

            {/* ════════════ MODAL: OBSERVAÇÕES (RESSALVAS) ════════════ */}
            {finalizeData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-600">
                            <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                            <h2 className="text-lg font-bold">Conferência com Ressalvas</h2>
                        </div>

                        <div className="bg-amber-50 rounded-lg p-3 space-y-1 text-sm">
                            {finalizeData.resumo.missing > 0 && (
                                <p className="text-red-700">❌ Faltando: <strong>{finalizeData.resumo.missing}</strong> itens</p>
                            )}
                            {finalizeData.resumo.excess > 0 && (
                                <p className="text-amber-700">⚠️ Excedente: <strong>{finalizeData.resumo.excess}</strong> itens</p>
                            )}
                            {finalizeData.resumo.extra > 0 && (
                                <p className="text-orange-700">📦 Fora do Pedido: <strong>{finalizeData.resumo.extra}</strong> itens</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Observações / Justificativa:
                            </label>
                            <textarea
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                placeholder="Ex: Substituí o produto 3283762483 - Sabonete Dove por Sabonete Prudence, pois não vamos receber esta semana..."
                                rows={4}
                                autoFocus
                                className="input-field w-full resize-none text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setFinalizeData(null)}
                                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => doFinalize(finalizeData.resumo, finalizeData.reportSnapshot, observacoes)}
                                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                            >
                                Finalizar mesmo assim
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Scanner */}
            {showScanner && (
                <BarcodeScanner onDetected={handleCameraScan} onClose={() => setShowScanner(false)} />
            )}
        </div>
    );
}
