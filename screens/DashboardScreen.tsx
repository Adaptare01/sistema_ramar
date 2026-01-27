import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { AppScreen } from '../types';
import { api } from '../services/api';
import { Plus, Upload, ScanLine, Printer, Smartphone, ChevronUp } from 'lucide-react';

interface DashboardProps {
    onNavigate: (screen: AppScreen) => void;
}

export const DashboardScreen = ({ onNavigate }: DashboardProps) => {
    const [stats, setStats] = useState({ totalCargas: 0, volumesAtivos: 0, progresso: 0, recentActivity: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.getDashboardStats();
                setStats(data);
            } catch (err) {
                console.error("Erro ao carregar dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="p-6 space-y-8 animate-fade-in">

            {/* System Overview */}
            <section>
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-xl font-bold">Visão Geral</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-blue-400 font-bold tracking-wider uppercase">Operação em Tempo Real</span>
                        </div>
                    </div>
                    <Smartphone className="text-gray-600" />
                </div>

                <Card className="bg-gradient-to-br from-[#151b26] to-[#0f1219] border-none shadow-2xl relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[80px] opacity-10"></div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-[var(--bg-app)]/50 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-400">Total de Cargas</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">{stats.totalCargas}</span>
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-app)]/50 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-400">Volumes Ativos</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">{stats.volumesAtivos}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-gray-400">Itens Verificados</span>
                                    <span className="text-blue-400 font-bold">{stats.progresso}%</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000"
                                        style={{ width: `${Math.min(stats.progresso, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </section>

            {/* Quick Actions */}
            <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Card onClick={() => onNavigate('upload')} className="group">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all mb-3">
                            <Plus size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-gray-200">Nova Conferência</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Iniciar fechamento</p>
                    </Card>

                    <Card onClick={() => onNavigate('upload')} className="group">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all mb-3">
                            <Upload size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-gray-200">Importar XML</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Carregar minuta</p>
                    </Card>

                    <Card onClick={() => onNavigate('conference')} className="group">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all mb-3">
                            <ScanLine size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-gray-200">Bipar Etiqueta</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Verificação rápida</p>
                    </Card>

                    <Card className="group opacity-50">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all mb-3">
                            <Printer size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-gray-200">Imprimir Etiquetas</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Reimpressão</p>
                    </Card>
                </div>
            </section>

            {/* Recent Logs (Visual only for now) */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Registros Recentes</h3>
                    <span className="text-[10px] text-cyan-500 cursor-pointer">Ver Todos</span>
                </div>

                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((log: any, i: number) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${log.status === 'CONCLUIDO' ? 'bg-green-500 shadow-green-500' : 'bg-blue-500 shadow-blue-500'}`}></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-200">{log.nome_arquivo}</p>
                                        <p className="text-[10px] text-gray-500">{log.status}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono text-gray-600">
                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))) : (
                        <div className="p-6 text-center text-gray-500 text-sm">Nenhuma atividade recente</div>
                    )}
                </div>
            </section>

            {/* Spacer for bottom nav */}
            <div className="h-10"></div>
        </div>
    );
};
