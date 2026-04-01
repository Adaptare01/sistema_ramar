'use client';

import { useEffect, useState } from 'react';
import { Truck, Package, BarChart3, Clock } from 'lucide-react';

interface DashboardData {
    totalCargas: number;
    volumesAtivos: number;
    progresso: number;
    recentActivity: { nome_arquivo: string; status: string; created_at: string }[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then((r) => r.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card animate-pulse h-24" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    icon={<Truck className="w-6 h-6" />}
                    label="Cargas Importadas"
                    value={data?.totalCargas ?? 0}
                    color="blue"
                />
                <StatCard
                    icon={<Package className="w-6 h-6" />}
                    label="Volumes Ativos"
                    value={data?.volumesAtivos ?? 0}
                    color="amber"
                />
                <StatCard
                    icon={<BarChart3 className="w-6 h-6" />}
                    label="Progresso Geral"
                    value={`${data?.progresso ?? 0}%`}
                    color="green"
                />
            </div>

            {/* Recent Activity */}
            <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Atividade Recente
                </h2>
                {data?.recentActivity && data.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {data.recentActivity.map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{item.nome_arquivo}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.status === 'ABERTO'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade recente</p>
                )}
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: 'blue' | 'amber' | 'green';
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        green: 'bg-green-50 text-green-600',
    };

    return (
        <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
            </div>
        </div>
    );
}
