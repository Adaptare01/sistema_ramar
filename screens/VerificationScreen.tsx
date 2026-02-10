import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ClientData, ScannedItem, Volume, ProductDbItem } from '../types';
import { api } from '../services/api'; // Import API
import { playSound } from '../utils/sound';
import { Trash2, CheckCircle, AlertTriangle, ChevronRight, X, ArrowLeft, Camera, AlertCircle, Check, MinusCircle, PlusCircle, Edit, Lock, Printer, Tag, Box, Play } from 'lucide-react';
import { Card } from '../components/Card';

interface VerificationScreenProps {
    client: ClientData;
    cargaId: string; // Recieve cargaId
    onBack: () => void;
}

export const VerificationScreen = ({ client, cargaId, onBack }: VerificationScreenProps) => {
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [currentVolumeId, setCurrentVolumeId] = useState<number | null>(null); // Visual sequential ID
    const [currentVolumeUUID, setCurrentVolumeUUID] = useState<string | null>(null); // Database ID
    const [barcode, setBarcode] = useState("");
    const [alertMsg, setAlertMsg] = useState<{ type: 'error' | 'info' | 'warning', msg: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Modals & Reports
    const [showFinalReport, setShowFinalReport] = useState(false);
    const [showBlockingModal, setShowBlockingModal] = useState(false);
    const [blockingErrors, setBlockingErrors] = useState<any[]>([]);
    const [showCamera, setShowCamera] = useState(false);

    // Qty Modal States
    const [showQtyModal, setShowQtyModal] = useState(false);
    const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
    const [pendingProduct, setPendingProduct] = useState<{ nome: string, expected: number, isExtra?: boolean } | null>(null); // New State

    // Qty Modal States
    const [qtyInput, setQtyInput] = useState<string>("1");
    // Not strictly needed if scanning 1 by 1, but kept for future bulk scan

    // Load ID Generation
    const loadId = useMemo(() => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = String(today.getFullYear()).slice(-2);
        return `${client.id}-${day}${month}${year}`;
    }, [client.id]);

    // Initial Load - Get Volumes
    useEffect(() => {
        loadVolumes();
    }, [client.id, cargaId]);

    const loadVolumes = async () => {
        try {
            const vols = await api.getVolumes(client.id, cargaId);
            // Map backend volume to frontend Volume interface
            const mappedVols: Volume[] = vols.map((v: any) => ({
                id: v.numero_sequencial,
                uuid: v.id, // Store database UUID
                isOpen: v.is_open,
                items: (v.items || []).map((i: any) => ({
                    ean: i.produto_ean,
                    referencia: i.produto_referencia,
                    nome: '', // Backend doesn't return name in item directly
                    id: i.id, // VITAL: UUID for delete/update
                    timestamp: i.created_at ? new Date(i.created_at).getTime() : Date.now(),
                    quantity: parseFloat(i.quantidade)
                }))
            }));
            setVolumes(mappedVols);

            // Auto-select open volume
            const openVol = vols.find((v: any) => v.is_open);
            if (openVol) {
                setCurrentVolumeId(openVol.numero_sequencial);
                setCurrentVolumeUUID(openVol.id);
            }
        } catch (err) {
            console.error("Erro ao carregar volumes", err);
        }
    };

    // Calculations
    const allScannedItems = volumes.flatMap(v => v.items);

    const scannedMap = useMemo(() => {
        const map = new Map<string, number>();
        allScannedItems.forEach(i => {
            map.set(i.referencia, (map.get(i.referencia) || 0) + i.quantity);
        });
        return map;
    }, [volumes]);

    const totalScannedCount = allScannedItems.reduce((acc, i) => acc + i.quantity, 0);
    // Progress based on unique products scanned vs total unique products in order
    const uniqueScannedCount = client.items.filter(item => (scannedMap.get(item.referencia) || 0) > 0).length;
    const totalUniqueItems = client.items.length;
    const progressPercent = totalUniqueItems > 0 ? Math.round((uniqueScannedCount / totalUniqueItems) * 100) : 0;

    // Focus Management
    useEffect(() => {
        const keepFocus = () => {
            if (!showFinalReport && !showBlockingModal && !showCamera && currentVolumeId !== null && inputRef.current) {
                inputRef.current.focus();
            }
        };
        const interval = setInterval(keepFocus, 1000);
        return () => clearInterval(interval);
    }, [currentVolumeId, showFinalReport, showBlockingModal, showCamera]);

    // Camera Logic (Same as before)
    useEffect(() => {
        if (showCamera) {
            setTimeout(() => {
                if (scannerRef.current) scannerRef.current.clear().catch(console.error);
                const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
                scannerRef.current = scanner;
                scanner.render((decodedText) => {
                    console.log("Scanned:", decodedText);
                    processBarcode(decodedText);
                    setShowCamera(false);
                }, () => { });
            }, 100);
            return () => { if (scannerRef.current) scannerRef.current.clear().catch(console.error); };
        }
    }, [showCamera]);


    // Logic: Process Barcode (Triggers Modal)
    const processBarcode = useCallback(async (code: string) => {
        const cleanCode = code.trim();
        if (!cleanCode) return;

        if (currentVolumeUUID === null) {
            setAlertMsg({ type: 'error', msg: 'Abra um volume antes de bipar!' });
            playSound('error');
            setBarcode("");
            return;
        }

        setPendingBarcode(cleanCode);
        setQtyInput("1");
        setPendingProduct(null); // Show 'Buscando...'
        setShowQtyModal(true);

        try {
            // 1. Lookup Product in DB
            const product = await api.getProduct(cleanCode);

            // 2. Match with Client Order (client.items)
            // Note: client.items uses 'referencia', product has 'referencia'
            const orderItem = client.items.find((i: any) => i.referencia === product.referencia || i.referencia === parseInt(product.referencia).toString());

            setPendingProduct({
                nome: product.nome || product.descricao || 'Produto sem nome',
                expected: orderItem ? orderItem.quantidadeEsperada : 0,
                isExtra: !orderItem
            });

        } catch (err) {
            console.warn("Produto não encontrado para pré-visualização", err);
            setPendingProduct({ nome: 'Produto Não Cadastrado', expected: 0 });
        }
    }, [currentVolumeUUID, client.items]);

    const confirmScan = async () => {
        if (!pendingBarcode || !currentVolumeUUID) return;

        // Block unregistered products
        if (pendingProduct?.nome === 'Produto Não Cadastrado') {
            setAlertMsg({ type: 'error', msg: 'Produto não cadastrado não pode ser adicionado!' });
            playSound('error');
            return;
        }

        // Allow extra products (WARNING but NOT BLOCKING)
        if (pendingProduct?.isExtra) {
            // Just a visual warning, logic continues
            console.warn("Item extra detectado");
        }

        try {
            const qty = parseInt(qtyInput) || 1;
            const result = await api.scanItem(currentVolumeUUID, pendingBarcode, qty);

            setAlertMsg({ type: 'info', msg: `Bipado: ${result.product.descricao} (${qty}x)` });
            playSound('success');
            setBarcode(""); // Clear input 
            loadVolumes();

            if (result.isExtra) {
                setAlertMsg({ type: 'error', msg: `ITEM EXTRA: ${result.product.descricao}` });
                playSound('error');
            } else if (result.warning && result.warning.type === 'EXCESS_QUANTITY') {
                setAlertMsg({
                    type: 'warning',
                    msg: `ATENÇÃO: Quantidade (${result.warning.attempted}) maior que o pedido (${result.warning.expected})!`
                });
                playSound('error'); // Keep error sound for attention
            }

            setShowQtyModal(false);
            setPendingBarcode(null);

            // Refocus main input after delay
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 100);

        } catch (err: any) {
            setAlertMsg({ type: 'error', msg: err || 'Erro ao bipar' });
            playSound('error');
            setBarcode(""); // Clear even on error?
            setShowQtyModal(false); // Close modal on error to allow retry
            setPendingBarcode(null);
        }
    };

    // Logic: Volume Management
    const handleOpenVolume = async () => {
        if (currentVolumeId !== null) {
            alert("Feche o volume atual primeiro.");
            return;
        }
        try {
            const res = await api.createVolume(cargaId, client.id);
            if (res.success) {
                await loadVolumes();
                setAlertMsg({ type: 'info', msg: 'Volume Aberto' });
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCloseVolume = async () => {
        if (currentVolumeUUID !== null) {
            if (confirm("Deseja fechar este volume?")) {
                try {
                    await api.closeVolume(currentVolumeUUID);
                    setAlertMsg({ type: 'info', msg: 'Volume Fechado' });
                    setCurrentVolumeId(null);
                    setCurrentVolumeUUID(null);
                    setBarcode("");
                    loadVolumes();
                } catch (err: any) {
                    alert(err.message);
                }
            }
        }
    };

    const handleEditVolume = async (volUUID: string) => {
        if (!volUUID) return;

        if (currentVolumeId !== null) {
            alert(`JÁ EXISTE UM VOLUME ABERTO (${currentVolumeId}). Feche-o antes de reabrir outro.`);
            return;
        }

        if (confirm("Deseja REABRIR este volume para conferência?")) {
            try {
                await api.reopenVolume(volUUID);
                setAlertMsg({ type: 'info', msg: 'Volume Reaberto!' });
                await loadVolumes();
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (confirm("Tem certeza que deseja remover este item?")) {
            try {
                await api.deleteItem(itemId);
                setAlertMsg({ type: 'info', msg: 'Item removido' });
                await loadVolumes();
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const handleUpdateQuantity = async (itemId: string, currentQty: number) => {
        const newQtyStr = prompt("Nova Quantidade:", String(currentQty));
        if (newQtyStr !== null) {
            const newQty = parseInt(newQtyStr);
            if (!isNaN(newQty) && newQty > 0) {
                try {
                    await api.updateItemQuantity(itemId, newQty);
                    setAlertMsg({ type: 'info', msg: 'Quantidade Atualizada' });
                    await loadVolumes();
                } catch (err: any) {
                    alert(err.message);
                }
            }
        }
    };

    // Logic: Finalization
    const handleAttemptFinalize = () => {
        if (currentVolumeId !== null) {
            alert("Feche o volume aberto antes de finalizar.");
            return;
        }

        const errors: any[] = [];

        // 1. Check for Missing or Excess items in EXPECTED list
        client.items.forEach(expected => {
            const scanned = scannedMap.get(expected.referencia) || 0;
            if (scanned !== expected.quantidadeEsperada) {
                errors.push({
                    nome: expected.nome,
                    scanned,
                    diff: scanned - expected.quantidadeEsperada,
                    type: scanned < expected.quantidadeEsperada ? 'MISSING' : 'EXCESS'
                });
            }
        });

        // 2. Check for EXTRA items (scanned but not in client.items)
        scannedMap.forEach((qty, ref) => {
            const isExpected = client.items.some(i => i.referencia === ref);
            if (!isExpected) {
                // We need to find the name of this extra product. 
                // Since we don't have a direct lookup here, we try to find it in the scanned items list
                const nameItem = allScannedItems.find(i => i.referencia === ref);
                errors.push({
                    nome: nameItem?.nome || `REF: ${ref}`,
                    scanned: qty,
                    diff: qty,
                    type: 'EXTRA'
                });
            }
        });

        if (errors.length > 0) {
            setBlockingErrors(errors);
            setShowBlockingModal(true);
            playSound('error');
        } else {
            playSound('success');
            setShowFinalReport(true);
        }
    };

    const currentVolume = volumes.find(v => v.id === currentVolumeId);

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-white relative">

            {/* 1. TOP HEADER (STICKY) */}
            <div className="bg-[var(--bg-panel)]/90 backdrop-blur-sm border-b border-[var(--border-color)] p-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5 text-black" />
                    </button>
                    <div>
                        <h2 className="text-sm font-bold text-black">{client.name.substring(0, 20)}{client.name.length > 20 ? '...' : ''}</h2>
                        <div className="flex items-center gap-2 text-xs text-black font-mono mt-0.5">
                            <span className="bg-black/5 px-1 rounded border border-black/10 text-black">{loadId}</span>
                            <span>•</span>
                            <span className={progressPercent === 100 ? 'text-[var(--success)]' : 'text-[var(--primary)]'}>{progressPercent}% Pronto</span>
                        </div>
                    </div>
                </div>
                <button onClick={handleAttemptFinalize} className="bg-[var(--success)] hover:bg-green-600 text-black font-bold text-xs py-2 px-3 rounded-lg shadow-lg flex items-center gap-1">
                    <CheckCircle size={14} /> FINALIZAR
                </button>
            </div>

            {/* 2. PROGRESS BAR */}
            <div className="h-1 bg-[var(--bg-app)] w-full">
                <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--success)] transition-all duration-500 shadow-[0_0_10px_var(--primary)]" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* 3. MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

                {/* Alert Banner */}
                {alertMsg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 shadow-lg border animate-fade-in ${alertMsg.type === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : (alertMsg.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-green-500/10 border-green-500/30 text-green-400')
                        }`}>
                        {alertMsg.type === 'error' ? <AlertTriangle size={20} /> : (alertMsg.type === 'warning' ? <AlertCircle size={20} /> : <CheckCircle size={20} />)}
                        <span className="font-bold text-sm">{alertMsg.msg}</span>
                    </div>
                )}

                {/* Volume Control Card */}
                {currentVolumeId === null ? (
                    <Card className="text-center py-8 border-dashed border-2 border-[var(--border-color)] bg-transparent">
                        <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--primary)]">
                            <Box size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-black">Nenhum Volume Ativo</h3>
                        <p className="text-xs text-black mb-6">Inicie uma nova caixa para começar a bipar itens.</p>
                        <button
                            onClick={handleOpenVolume}
                            className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_var(--primary-glow)] transition flex items-center gap-2 mx-auto"
                        >
                            <Play size={16} fill="black" /> ABRIR NOVO VOLUME
                        </button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {/* Active Volume Header */}
                        <div className="flex justify-between items-center bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--primary)]/30 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-3">
                                <div className="bg-[var(--primary)] text-black font-bold w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-[0_0_10px_var(--primary-glow)]">
                                    {currentVolumeId}
                                </div>
                                <div>
                                    <span className="text-black text-sm">Volume Atual:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-black tracking-widest">
                                            {client.id}_{currentVolumeId}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
                                            ABERTO
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleCloseVolume} className="text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition">
                                FECHAR CAIXA
                            </button>
                        </div>

                        {/* Input Area */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={barcode}
                                    onChange={e => setBarcode(e.target.value)}
                                    // Use 'Enter' to trigger processBarcode
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            processBarcode(barcode);
                                        }
                                    }}
                                    placeholder="Bipar ou digitar EAN..."
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-black p-4 pl-12 rounded-xl focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition font-mono"
                                    autoFocus
                                    disabled={showQtyModal} // Disable while modal is open
                                />
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-5 h-5 pointer-events-none" />
                            </div>
                            <button
                                onClick={() => setShowCamera(true)}
                                className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl text-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                            >
                                <Camera size={24} />
                            </button>
                        </div>

                        {/* Scanned Items List */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest pl-1">Itens nesta caixa</h3>
                            {currentVolume && currentVolume.items.length > 0 ? (
                                [...currentVolume.items].reverse().map((item) => (
                                    <div key={item.timestamp} className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] flex justify-between items-center group animate-fade-in">
                                        <div className="flex gap-3 items-center overflow-hidden">
                                            <div onClick={() => handleUpdateQuantity(item.id || '', item.quantity)} className="bg-[var(--bg-app)] w-12 h-8 flex items-center justify-center rounded text-xs font-bold text-gray-400 border border-[var(--border-color)] cursor-pointer hover:border-[var(--primary)] hover:text-white transition">
                                                {item.quantity}x
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-black truncate">{item.nome || item.referencia}</p> {/* Fallback name */}
                                                <p className="text-[10px] text-black font-mono">EAN: {item.ean}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteItem(item.id || '')} className="p-2 text-gray-500 hover:text-red-400 transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-black italic text-sm">
                                    Caixa vazia. Bipe itens para adicionar.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Previous Volumes */}
                {volumes.length > 1 && (
                    <div className="pt-8 border-t border-[var(--border-color)]">
                        <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4">Volumes Completos</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {volumes.filter(v => v.id !== currentVolumeId).map(vol => (
                                <div key={vol.id} className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] opacity-70 hover:opacity-100 transition flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-black">Volume {vol.id}</p>
                                        <p className="text-[10px] text-black">{vol.items.length} itens</p>
                                    </div>
                                    <button onClick={() => handleEditVolume(vol.uuid)} className="text-[var(--primary)] hover:bg-[var(--primary)]/10 p-2 rounded-lg transition" title="Reabrir Volume para Conferência">
                                        <Edit size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}

            {/* A. QUANTITY MODAL */}
            {showQtyModal && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6">
                    <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-2xl border border-[var(--primary-glow)] shadow-[0_0_30px_rgba(0,255,127,0.15)] p-6 relative">
                        <h2 className="text-black font-bold text-lg mb-1 text-center">Quantidade</h2>
                        <p className="text-black text-xs text-center mb-6 font-mono break-all">{pendingBarcode}</p>

                        {/* PRODUCT INFO */}
                        {pendingProduct ? (
                            <div className={`rounded-lg p-3 mb-6 text-center border animate-fade-in ${pendingProduct.isExtra ? 'bg-orange-500/20 border-orange-500/50' : 'bg-[var(--bg-app)] border-[var(--primary)]/30'}`}>
                                <p className={`font-bold text-sm leading-tight mb-1 ${pendingProduct.nome === 'Produto Não Cadastrado' ? 'text-red-500' : (pendingProduct.isExtra ? 'text-orange-400' : 'text-[var(--primary)]')}`}>
                                    {pendingProduct.nome}
                                </p>
                                {pendingProduct.isExtra ? (
                                    <p className="text-orange-400 font-bold text-xs mt-1">PRODUTO NÃO PERTENCE AO PEDIDO</p>
                                ) : (
                                    <p className="text-black text-xs">
                                        Pedido: <strong className="text-black">{pendingProduct.expected}</strong> UN
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[var(--bg-app)] rounded-lg p-3 mb-6 text-center border border-[var(--border-color)] animate-pulse">
                                <p className="text-black text-xs">Buscando produto...</p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-4 mb-8">
                            <button onClick={() => setQtyInput(String(Math.max(1, (parseInt(qtyInput) || 1) - 1)))} className="p-4 bg-[var(--bg-app)] rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] text-black">
                                <MinusCircle size={24} />
                            </button>

                            <input
                                type="number"
                                value={qtyInput}
                                onChange={e => setQtyInput(e.target.value)}
                                className="w-24 bg-transparent text-center text-4xl font-bold text-black outline-none"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && confirmScan()}
                            />

                            <button onClick={() => setQtyInput(String((parseInt(qtyInput) || 0) + 1))} className="p-4 bg-[var(--bg-app)] rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] text-black">
                                <PlusCircle size={24} />
                            </button>
                        </div>

                        <button
                            onClick={confirmScan}
                            disabled={pendingProduct?.nome === 'Produto Não Cadastrado'}
                            className={`w-full py-4 text-black font-bold rounded-xl shadow-[0_0_20px_var(--primary-glow)] text-lg transition ${pendingProduct?.nome === 'Produto Não Cadastrado' ? 'bg-gray-500 cursor-not-allowed opacity-50' : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'}`}
                        >
                            CONFIRMAR (ENTER)
                        </button>
                        <button
                            onClick={() => { setShowQtyModal(false); setPendingBarcode(null); setBarcode(""); }}
                            className="w-full mt-3 py-3 text-black text-xs hover:text-gray-700 transition"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            )}

            {/* 0. CAMERA MODAL */}
            {showCamera && (
                <div className="fixed inset-0 bg-black/90 z-[90] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden relative">
                        <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition">
                            <X size={24} />
                        </button>
                        <div id="reader" className="w-full h-auto"></div>
                        <div className="p-4 text-center text-black text-sm">
                            Aponte a câmera para o código de barras
                        </div>
                    </div>
                </div>
            )}

            {/* 3. BLOCKING ERROR MODAL */}
            {showBlockingModal && (
                <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-6">
                    <div className="bg-[var(--bg-card)] max-w-lg w-full rounded-2xl border border-red-500/50 shadow-2xl relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600 p-4 rounded-full border-4 border-black">
                            <Lock className="text-white w-8 h-8" />
                        </div>
                        <div className="pt-12 p-6 text-center">
                            <h2 className="text-2xl font-bold text-black mb-2">Divergência na Conferência</h2>
                            <p className="text-black text-sm mb-6">Por favor, corrija os erros abaixo antes de finalizar.</p>
                            <div className="bg-gray-100 rounded-lg p-4 max-h-60 overflow-y-auto mb-6 text-left space-y-2 border border-gray-200">
                                {blockingErrors.map((err, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                        <span className="text-black font-medium">{err.nome}</span>
                                        <span className={err.diff < 0 ? 'text-red-400 font-bold' : 'text-orange-400 font-bold'}>
                                            {err.diff < 0
                                                ? `Faltando ${Math.abs(err.diff)}`
                                                : (err.type === 'EXTRA' ? `EXTRA: ${err.diff}` : `Excesso: ${err.diff}`)
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowBlockingModal(false)} className="w-full py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] text-black font-bold rounded-lg hover:bg-black/5 transition mb-3">
                                VOU CORRIGIR
                            </button>
                            <button onClick={() => { setShowBlockingModal(false); setShowFinalReport(true); }} className="w-full py-3 bg-orange-500/20 border border-orange-500/50 text-orange-600 font-bold rounded-lg hover:bg-orange-500/30 transition">
                                FINALIZAR COM RESSALVAS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. SUCCESS / REPORT */}
            {showFinalReport && (
                <div className="fixed inset-0 bg-[var(--bg-app)] z-[80] flex flex-col items-center justify-center p-8 animate-fade-in">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                        <Check className="text-green-500 w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-bold text-black mb-2">Sucesso!</h1>
                    <p className="text-black text-center max-w-xs mb-8">Todos os itens conferem com o manifesto. Carga {loadId} pronta.</p>
                    <button onClick={() => { setShowFinalReport(false); onBack(); }} className="bg-white text-black font-bold py-3 px-8 rounded-full shadow-xl hover:scale-105 transition">
                        VOLTAR AO INÍCIO
                    </button>
                </div>
            )}
        </div>
    );
};
