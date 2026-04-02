'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Truck, Users, Clock, CheckCircle, AlertTriangle, DollarSign,
    Timer, Loader2, Filter, LayoutDashboard
} from 'lucide-react';

interface DashboardData {
    totalCargas: number;
    clientesTotais: number;
    emSeparacao: number;
    finalizados: number;
    comRessalva: number;
    faturados: number;
    tempoMedioConferencia: number | null;
    tempoMedioFaturamento: number | null;
}

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMinutes(min: number | null): string {
    if (min === null || min === undefined) return '--';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    const [mes, setMes] = useState<string>('');
    const [ano, setAno] = useState<string>('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (ano) params.set('ano', ano);
            if (mes) params.set('mes', mes);
            const qs = params.toString();
            const res = await fetch(`/api/dashboard${qs ? '?' + qs : ''}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [mes, ano]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Generate year options (current year and 2 years back)
    const currentYear = now.getFullYear();
    const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

    function clearFilters() {
        setMes('');
        setAno('');
    }

    const hasFilter = mes || ano;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex items-center gap-3 flex-wrap">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Período:</span>

                    <select
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Todos os meses</option>
                        {MESES.map((m, i) => (
                            <option key={i} value={String(i + 1)}>{m}</option>
                        ))}
                    </select>

                    <select
                        value={ano}
                        onChange={(e) => setAno(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Todos os anos</option>
                        {yearOptions.map((y) => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>

                    {hasFilter && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <>
                    {/* Status Cards — 6 cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                        <StatCard
                            icon={<Truck className="w-5 h-5" />}
                            label="Cargas Importadas"
                            value={data?.totalCargas ?? 0}
                            bgColor="bg-blue-50"
                            iconColor="text-blue-600"
                        />
                        <StatCard
                            icon={<Users className="w-5 h-5" />}
                            label="Clientes Totais"
                            value={data?.clientesTotais ?? 0}
                            bgColor="bg-indigo-50"
                            iconColor="text-indigo-600"
                        />
                        <StatCard
                            icon={<Clock className="w-5 h-5" />}
                            label="Em Separação"
                            value={data?.emSeparacao ?? 0}
                            bgColor="bg-cyan-50"
                            iconColor="text-cyan-600"
                        />
                        <StatCard
                            icon={<CheckCircle className="w-5 h-5" />}
                            label="Finalizados"
                            value={data?.finalizados ?? 0}
                            bgColor="bg-green-50"
                            iconColor="text-green-600"
                        />
                        <StatCard
                            icon={<AlertTriangle className="w-5 h-5" />}
                            label="Com Ressalva"
                            value={data?.comRessalva ?? 0}
                            bgColor="bg-amber-50"
                            iconColor="text-amber-600"
                        />
                        <StatCard
                            icon={<DollarSign className="w-5 h-5" />}
                            label="Faturados"
                            value={data?.faturados ?? 0}
                            bgColor="bg-emerald-50"
                            iconColor="text-emerald-600"
                        />
                    </div>

                    {/* Productivity Cards */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Timer className="w-5 h-5 text-gray-400" />
                            Índices de Produtividade
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="card border-l-4 border-l-purple-500">
                                <p className="text-sm text-gray-500 mb-1">Tempo Médio de Conferência</p>
                                <p className="text-xs text-gray-400 mb-2">Abertura → Fechamento (por cliente)</p>
                                <p className="text-3xl font-bold text-purple-700">
                                    {formatMinutes(data?.tempoMedioConferencia ?? null)}
                                </p>
                            </div>
                            <div className="card border-l-4 border-l-teal-500">
                                <p className="text-sm text-gray-500 mb-1">Tempo Médio até Faturamento</p>
                                <p className="text-xs text-gray-400 mb-2">Fechamento → Faturamento pelo supervisor</p>
                                <p className="text-3xl font-bold text-teal-700">
                                    {formatMinutes(data?.tempoMedioFaturamento ?? null)}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    bgColor,
    iconColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    bgColor: string;
    iconColor: string;
}) {
    return (
        <div className="card flex flex-col items-center text-center p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor} ${iconColor} mb-2`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}
