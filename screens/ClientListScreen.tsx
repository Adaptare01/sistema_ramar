import React from 'react';
import { ClientData } from '../types';
import { ChevronRight, Package, Truck } from 'lucide-react';

interface ClientListScreenProps {
    clients: ClientData[];
    onSelect: (c: ClientData) => void;
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
                        className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] hover:shadow-[0_0_15px_rgba(0,212,255,0.15)] cursor-pointer transition group relative overflow-hidden"
                    >
                        {/* Active Indication Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition"></div>

                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-[var(--bg-app)] flex items-center justify-center border border-[var(--border-color)] group-hover:border-[var(--primary)]/30 transition">
                                    <Truck className="w-6 h-6 text-black group-hover:text-[var(--primary)] transition" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition">{client.name}</h2>
                                    <p className="text-xs text-[var(--text-secondary)] font-mono">ID: {client.id}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center gap-1 justify-end text-[var(--primary)] font-bold text-xl">
                                    <Package size={16} />
                                    <span>{client.totalItems}</span>
                                </div>
                                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Itens</span>
                            </div>
                        </div>

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-10 translate-x-4 group-hover:translate-x-0 transition duration-300">
                            <ChevronRight className="text-[var(--primary)]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
