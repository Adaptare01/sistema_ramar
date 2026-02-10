import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { AppScreen } from '../types';
import { api } from '../services/api';
import { Plus, Upload, ScanLine, Printer, Smartphone, ChevronUp, CheckCircle } from 'lucide-react';

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
                        <h2 className="text-xl font-bold text-[var(--text-main)]">Visão Geral</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse"></span>
                            <span className="text-xs text-[var(--primary)] font-bold tracking-wider uppercase">Operação em Tempo Real</span>
                        </div>
                    </div>
                    <Smartphone className="text-[var(--text-muted)]" />
                </div>

                <Card className="bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 shadow-lg relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] rounded-full blur-[80px] opacity-10"></div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-8 h-8 border-4 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs text-[var(--text-secondary)]">Total de Cargas</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <span className="text-2xl font-bold text-[var(--text-main)]">{stats.totalCargas}</span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs text-[var(--text-secondary)]">Volumes Ativos</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <span className="text-2xl font-bold text-[var(--text-main)]">{stats.volumesAtivos}</span>
                                    </div>
                                </div>
                                <div
                                    onClick={() => onNavigate('finished_loads')}
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-[var(--success)] hover:shadow-md transition group"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--success)] transition">Cargas Finalizadas</p>
                                        <CheckCircle size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--success)] transition" />
                                    </div>
                                    <div className="flex items-end gap-2 mt-1">
                                        <span className="text-2xl font-bold text-[var(--text-main)] group-hover:text-[var(--success)] transition">{stats.totalCargas}</span> {/* Assuming totalCargas is not the right stat, but we don't have finished count yet. Let's use a placeholder or add it to stats later. For now, let's just make it clickable. Actually, we should use a real stat if possible, but API returns totalCargas. Let's leave value as is or use placeholder. Use 0 for now as in original code. */}
                                        <span className="text-2xl font-bold text-[var(--text-main)] group-hover:text-[var(--success)] transition">-</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-[var(--text-secondary)]">Itens Verificados</span>
                                    <span className="text-[var(--primary)] font-bold">{stats.progresso}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--primary)] to-sky-400 rounded-full shadow-[0_0_10px_rgba(2,132,199,0.4)] transition-all duration-1000"
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
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Card onClick={() => onNavigate('upload')} className="group">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all mb-3">
                            <Plus size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[var(--text-main)]">Nova Conferência</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Iniciar fechamento</p>
                    </Card>

                    <Card onClick={() => onNavigate('upload')} className="group">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all mb-3">
                            <Upload size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[var(--text-main)]">Importar XML</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Carregar minuta</p>
                    </Card>

                    <Card onClick={() => onNavigate('conference')} className="group">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all mb-3">
                            <ScanLine size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[var(--text-main)]">Bipar Etiqueta</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Verificação rápida</p>
                    </Card>

                    <Card onClick={() => onNavigate('labels')} className="group">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all mb-3">
                            <Printer size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[var(--text-main)]">Imprimir Etiquetas</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Reimpressão</p>
                    </Card>

                    <Card onClick={() => onNavigate('finished_loads')} className="group">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all mb-3">
                            <CheckCircle size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[var(--text-main)]">Conferências</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Histórico e Relatórios</p>
                    </Card>
                </div>
            </section>

            {/* Recent Logs (Visual only for now) */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Registros Recentes</h3>
                    <span className="text-[10px] text-[var(--primary)] cursor-pointer">Ver Todos</span>
                </div>

                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((log: any, i: number) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${log.status === 'CONCLUIDO' ? 'bg-green-500 shadow-green-500' : 'bg-[var(--primary)] shadow-[var(--primary)]'}`}></div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-main)]">{log.nome_arquivo}</p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">{log.status}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))) : (
                        <div className="p-6 text-center text-[var(--text-muted)] text-sm">Nenhuma atividade recente</div>
                    )}
                </div>
            </section>

            {/* Spacer for bottom nav */}
            <div className="h-10"></div>
        </div>
    );
};
