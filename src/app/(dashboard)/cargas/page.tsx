'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ChevronRight, Truck, Search } from 'lucide-react';

interface Carga {
    id: string;
    nome_arquivo: string;
    status: string;
    total_itens: number;
    data_importacao: string;
    volumes_count: number;
    items_scanned: number;
}

export default function CargasPage() {
    const router = useRouter();
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadCargas();
    }, []);

    async function loadCargas() {
        try {
            const res = await fetch('/api/cargas');
            const data = await res.json();
            setCargas(data);
        } catch (err) {
            console.error('Erro ao carregar cargas:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleUploadXML(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const text = await file.text();
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmlContent: text, fileName: file.name }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Erro ao importar');
                return;
            }

            alert(`✅ ${data.message}\n${data.data.totalClientes} clientes, ${data.data.totalItens} itens`);
            setShowUpload(false);
            loadCargas();
        } catch (err) {
            console.error(err);
            alert('Erro ao importar arquivo');
        } finally {
            setUploading(false);
        }
    }

    const filtered = cargas.filter((c) =>
        c.nome_arquivo?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Cargas</h1>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Upload className="w-4 h-4" />
                    Importar XML
                </button>
            </div>

            {/* Upload Panel */}
            {showUpload && (
                <div className="card border-2 border-dashed border-primary/30 bg-primary/5">
                    <div className="text-center py-6">
                        <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-3">
                            Selecione o arquivo XML da minuta de carregamento
                        </p>
                        <label className="btn-primary cursor-pointer inline-block">
                            {uploading ? 'Processando...' : 'Escolher Arquivo'}
                            <input
                                type="file"
                                accept=".xml"
                                onChange={handleUploadXML}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar carga..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-10"
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card animate-pulse h-20" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card text-center py-12">
                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma carga encontrada</p>
                    <p className="text-sm text-gray-400 mt-1">Importe um arquivo XML para começar</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((carga) => {
                        const progress = carga.total_itens > 0
                            ? Math.min(100, (carga.items_scanned / carga.total_itens) * 100)
                            : 0;

                        return (
                            <button
                                key={carga.id}
                                onClick={() => router.push(`/cargas/${carga.id}`)}
                                className="card w-full text-left hover:border-primary/30 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {carga.nome_arquivo}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            <span>{new Date(carga.data_importacao).toLocaleDateString('pt-BR')}</span>
                                            <span>{carga.total_itens} itens</span>
                                            <span>{carga.volumes_count} volumes</span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${carga.status === 'ABERTO'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {carga.status}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
