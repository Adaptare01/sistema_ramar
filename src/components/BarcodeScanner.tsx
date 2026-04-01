'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, SwitchCamera } from 'lucide-react';

interface BarcodeScannerProps {
    onDetected: (code: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const readerRef = useRef<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const detectedRef = useRef(false);

    const stopScanner = useCallback(() => {
        if (readerRef.current) {
            try {
                readerRef.current.reset();
            } catch { /* ignore */ }
            readerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startScanner = useCallback(async () => {
        setError(null);
        detectedRef.current = false;

        try {
            // Dynamic import to avoid SSR issues
            const { BrowserMultiFormatReader } = await import('@zxing/browser');

            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;

            // Get video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter((d) => d.kind === 'videoinput');

            let deviceId: string | undefined;

            if (facingMode === 'environment') {
                // Prefer back camera
                const backCam = videoDevices.find(
                    (d) =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('traseira') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('environment')
                );
                deviceId = backCam?.deviceId || videoDevices[videoDevices.length - 1]?.deviceId;
            } else {
                const frontCam = videoDevices.find(
                    (d) =>
                        d.label.toLowerCase().includes('front') ||
                        d.label.toLowerCase().includes('frontal') ||
                        d.label.toLowerCase().includes('user')
                );
                deviceId = frontCam?.deviceId || videoDevices[0]?.deviceId;
            }

            if (!videoRef.current) return;

            // Start continuous decode
            await reader.decodeFromVideoDevice(
                deviceId || undefined,
                videoRef.current,
                (result, err) => {
                    if (result && !detectedRef.current) {
                        detectedRef.current = true;
                        const code = result.getText();

                        // Vibrate feedback
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }

                        // Stop and callback
                        stopScanner();
                        onDetected(code);
                    }
                    // Ignore DecodeHintType / NotFoundException - normal when no barcode in frame
                }
            );

            // Save stream reference for cleanup
            if (videoRef.current?.srcObject) {
                streamRef.current = videoRef.current.srcObject as MediaStream;
            }
        } catch (err: any) {
            console.error('Scanner error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Permissão de câmera negada. Habilite nas configurações do navegador.');
            } else if (err.name === 'NotFoundError') {
                setError('Nenhuma câmera encontrada neste dispositivo.');
            } else {
                setError('Erro ao acessar a câmera: ' + (err.message || err));
            }
        }
    }, [facingMode, onDetected, stopScanner]);

    useEffect(() => {
        startScanner();
        return () => stopScanner();
    }, [startScanner, stopScanner]);

    function handleSwitchCamera() {
        stopScanner();
        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }

    function handleClose() {
        stopScanner();
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
                <button onClick={handleClose} className="p-2 text-white hover:bg-white/20 rounded-full">
                    <X className="w-6 h-6" />
                </button>
                <span className="text-white font-medium text-sm">Escanear Código de Barras</span>
                <button onClick={handleSwitchCamera} className="p-2 text-white hover:bg-white/20 rounded-full">
                    <SwitchCamera className="w-6 h-6" />
                </button>
            </div>

            {/* Camera view */}
            <div className="flex-1 relative overflow-hidden">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="text-center">
                            <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={startScanner}
                                className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            playsInline
                            autoPlay
                            muted
                        />

                        {/* Scan overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Darkened edges */}
                            <div className="absolute inset-0 bg-black/40" />

                            {/* Scan window */}
                            <div className="relative w-[85%] max-w-sm h-36 border-2 border-white/80 rounded-xl z-10"
                                style={{
                                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                                }}
                            >
                                {/* Corner marks */}
                                <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl" />
                                <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl" />
                                <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl" />

                                {/* Animated scan line */}
                                <div className="absolute left-2 right-2 h-0.5 bg-red-500/80 animate-scan-line" />
                            </div>
                        </div>

                        {/* Helper text */}
                        <div className="absolute bottom-8 left-0 right-0 text-center z-10">
                            <p className="text-white/90 text-sm font-medium drop-shadow-lg">
                                Aponte a câmera para o código de barras
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
