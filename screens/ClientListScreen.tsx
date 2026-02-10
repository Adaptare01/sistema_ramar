import React from 'react';
import { ClientData } from '../types';
import { ChevronRight, Package, Truck } from 'lucide-react';

interface ClientListScreenProps {
    clients: ClientData[];
    onSelect: (c: ClientData) => void;
    onViewReport?: (reportId: string) => void;
}

export const ClientListScreen = ({ clients, onSelect }: ClientListScreenProps) => {
    return (
        <div className="p-6 animate-fade-in pb-24">
            <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Selecionar Cliente</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">{clients.length} clientes encontrados na minuta.</p>

            <div className="grid gap-4 md:grid-cols-2">
                {clients.map(client => (
                    <div
                        key={client.id}
                        onClick={() => onSelect(client)}
                        className={`p-5 rounded-xl border cursor-pointer transition group relative overflow-hidden ${client.isCompleted
                            ? 'bg-[var(--primary)] border-[var(--primary)] shadow-lg shadow-blue-500/30'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--primary)] hover:shadow-[0_0_15px_rgba(0,212,255,0.15)]'
                            }`}
                    >
                        {/* Active Indication Line (only for incomplete) */}
                        {!client.isCompleted && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition"></div>
                        )}

                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center border transition ${client.isCompleted
                                    ? 'bg-white/20 border-white/30'
                                    : 'bg-[var(--bg-app)] border-[var(--border-color)] group-hover:border-[var(--primary)]/30'
                                    }`}>
                                    <Truck className={`w-6 h-6 transition ${client.isCompleted ? 'text-white' : 'text-black group-hover:text-[var(--primary)]'
                                        }`} />
                                </div>
                                <div>
                                    <h2 className={`text-lg font-bold transition ${client.isCompleted ? 'text-white' : 'text-[var(--text-main)] group-hover:text-[var(--primary)]'
                                        }`}>{client.name}</h2>
                                    <p className={`text-xs font-mono ${client.isCompleted ? 'text-blue-100' : 'text-[var(--text-secondary)]'
                                        }`}>ID: {client.id}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className={`flex items-center gap-1 justify-end font-bold text-xl ${client.isCompleted ? 'text-white' : 'text-[var(--primary)]'
                                    }`}>
                                    <Package size={16} />
                                    <span>{client.totalItems}</span>
                                </div>
                                <span className={`text-[10px] uppercase tracking-wider ${client.isCompleted ? 'text-blue-100' : 'text-[var(--text-secondary)]'
                                    }`}>Itens</span>
                            </div>
                        </div>

                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition duration-300 flex items-center gap-2 ${client.isCompleted
                            ? 'translate-x-0 opacity-100'
                            : 'opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'
                            }`}>
                            {client.isCompleted && client.reportId ? (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onViewReport && client.reportId) onViewReport(client.reportId);
                                    }}
                                    className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/30 transition cursor-pointer z-20"
                                >
                                    <span className="text-white text-xs font-bold uppercase"> Relatório</span>
                                    <ChevronRight className="text-white w-4 h-4" />
                                </div>
                            ) : (
                                <ChevronRight className={client.isCompleted ? 'text-white' : 'text-[var(--primary)]'} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
