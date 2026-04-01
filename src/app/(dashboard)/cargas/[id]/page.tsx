'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, ChevronRight, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

interface ClientData {
    id: string;
    name: string;
    totalItems: number;
    totalScanned: number;
    isCompleted: boolean;
    reportId: string | null;
    hasReservations: boolean;
}

export default function CargaDetailPage() {
    const router = useRouter();
    const params = useParams();
    const cargaId = params.id as string;

    const [clients, setClients] = useState<ClientData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/cargas/${cargaId}/clients`)
            .then((r) => r.json())
            .then((data) => setClients(data.clients || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [cargaId]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.push('/cargas')} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Clientes da Carga</h1>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card animate-pulse h-20" />
                    ))}
                </div>
            ) : clients.length === 0 ? (
                <div className="card text-center py-12">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum cliente encontrado nesta carga</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {clients.map((cli) => {
                        const progress = cli.totalItems > 0
                            ? Math.min(100, (cli.totalScanned / cli.totalItems) * 100)
                            : 0;

                        return (
                            <div key={cli.id} className="card">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {cli.reportId ? (
                                                cli.hasReservations ? (
                                                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                )
                                            ) : null}
                                            <p className="font-medium text-gray-900 truncate">
                                                {cli.name || cli.id}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {cli.totalScanned} / {cli.totalItems} itens conferidos
                                        </p>
                                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        {cli.reportId && (
                                            <button
                                                onClick={() => router.push(`/relatorios/${cli.reportId}`)}
                                                className="p-2 text-gray-400 hover:text-primary"
                                                title="Ver relatório"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => router.push(`/conferencia/${cargaId}/${cli.id}`)}
                                            className="p-2 text-gray-400 hover:text-primary"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
