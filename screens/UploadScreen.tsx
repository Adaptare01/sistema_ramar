import React, { useState } from 'react';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';

interface UploadScreenProps {
    onProcess: (file: File) => void;
    isProcessing: boolean;
}

export const UploadScreen = ({ onProcess, isProcessing }: UploadScreenProps) => {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 animate-fade-in">
            <Card className="w-full max-w-md text-center p-8 bg-[var(--bg-card)] border border-[var(--border-color)]">

                <div className="w-20 h-20 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(0,212,255,0.2)] border border-[var(--border-color)]">
                    <FileText className="w-10 h-10 text-[var(--primary)]" />
                </div>

                <h1 className="text-2xl font-bold mb-2 text-white">Importar Minuta</h1>
                <p className="text-[var(--text-muted)] mb-8 text-sm">Selecione o arquivo XML do Crystal Reports para iniciar a conferência.</p>

                <label className={`block w-full border-2 border-dashed rounded-xl p-8 mb-8 transition cursor-pointer relative group overflow-hidden ${file ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition"></div>

                    <input type="file" accept=".xml" onChange={handleFileChange} className="hidden" />

                    <div className="relative z-10 flex flex-col items-center gap-2">
                        <Upload className={`w-8 h-8 ${file ? 'text-[var(--primary)]' : 'text-gray-500'}`} />
                        <span className={`font-medium ${file ? 'text-[var(--primary)]' : 'text-gray-500'}`}>
                            {file ? file.name : "Toque para selecionar XML"}
                        </span>
                    </div>
                </label>

                <button
                    onClick={() => file && onProcess(file)}
                    disabled={!file || isProcessing}
                    className={`w-full font-bold py-4 px-4 rounded-xl transition flex items-center justify-center relative overflow-hidden group ${!file || isProcessing
                        ? 'bg-[var(--bg-panel)] text-gray-500 cursor-not-allowed border border-[var(--border-color)]'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(0,180,255,0.4)]'
                        }`}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                            Processando...
                        </>
                    ) : (
                        <span className="relative z-10">PROCESSAR ARQUIVO</span>
                    )}

                    {/* Shine effect */}
                    {!isProcessing && file && (
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-1000"></div>
                    )}
                </button>
            </Card>
        </div>
    );
};
