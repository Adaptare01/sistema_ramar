import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Box, Printer, Calendar, User, Truck, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { ClientData } from '../types';

interface LabelScreenProps {
    onBack: () => void;
}

export const LabelScreen: React.FC<LabelScreenProps> = ({ onBack }) => {
    const [step, setStep] = useState<'loads' | 'clients' | 'labels'>('loads');
    const [cargas, setCargas] = useState<any[]>([]);
    const [selectedCarga, setSelectedCarga] = useState<any>(null);
    const [clients, setClients] = useState<ClientData[]>([]);
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [volumes, setVolumes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Load Cargas
    useEffect(() => {
        if (step === 'loads') {
            loadCargas();
        }
    }, [step]);

    const loadCargas = async () => {
        setLoading(true);
        try {
            const data = await api.getCargas();
            setCargas(data);
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar cargas');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCarga = async (carga: any) => {
        setLoading(true);
        setSelectedCarga(carga);
        try {
            const data = await api.getClientsForCarga(carga.id);
            setClients(data.clients);
            setStep('clients');
        } catch (err: any) {
            alert('Erro ao carregar clientes: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectClient = async (client: ClientData) => {
        setLoading(true);
        setSelectedClient(client);
        try {
            const vols = await api.getVolumes(client.id, selectedCarga.id);
            // Filter only open or closed? Usually labels are for verified/closed volumes, but let's show all created volumes.
            setVolumes(vols);
            setStep('labels');
        } catch (err: any) {
            alert('Erro ao carregar volumes: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-white relative">
            {/* Header - Hidden on Print */}
            <div className="bg-[var(--bg-panel)]/90 backdrop-blur-sm border-b border-[var(--border-color)] p-4 sticky top-0 z-20 flex justify-between items-center shadow-md print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => {
                        if (step === 'labels') setStep('clients');
                        else if (step === 'clients') setStep('loads');
                        else onBack();
                    }} className="p-2 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5 text-black" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-black">
                            {step === 'loads' && 'Selecione a Carga'}
                            {step === 'clients' && 'Selecione o Cliente'}
                            {step === 'labels' && 'Imprimir Etiquetas'}
                        </h2>
                        {selectedCarga && (
                            <p className="text-xs text-black truncate max-w-[200px]">
                                {selectedCarga.nome_arquivo}
                                {selectedClient && ` > ${selectedClient.name}`}
                            </p>
                        )}
                    </div>
                </div>
                {step === 'labels' && volumes.length > 0 && (
                    <button onClick={handlePrint} className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition">
                        <Printer size={18} /> IMPRIMIR
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 print:p-0 print:overflow-visible">

                {loading && (
                    <div className="flex justify-center items-center h-64 print:hidden">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    </div>
                )}

                {!loading && step === 'loads' && (
                    <div className="grid gap-4">
                        {cargas.map(carga => (
                            <div key={carga.id} onClick={() => handleSelectCarga(carga)} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] cursor-pointer transition flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-black">{carga.nome_arquivo}</h3>
                                        <p className="text-xs text-black flex items-center gap-1 mt-1">
                                            <Calendar size={12} />
                                            {new Date(carga.data_importacao).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="text-black group-hover:text-[var(--primary)] transition" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && step === 'clients' && (
                    <div className="grid gap-3">
                        {clients.map(client => (
                            <div key={client.id} onClick={() => handleSelectClient(client)} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] cursor-pointer transition flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-black">{client.name}</h3>
                                        <p className="text-xs text-black">ID: {client.id}</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-black group-hover:text-[var(--primary)] transition" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && step === 'labels' && (
                    <div className="space-y-8">
                        {volumes.length === 0 ? (
                            <div className="text-center py-12 text-black">
                                <Box size={48} className="mx-auto mb-4 opacity-30" />
                                <p>Nenhum volume encontrado para este cliente nesta carga.</p>
                            </div>
                        ) : (
                            <div className="print:grid print:grid-cols-2 print:gap-4 print:text-black">
                                {/* Only visible on screen grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
                                    {volumes.map(vol => (
                                        <div key={vol.id} className="bg-white text-black p-6 rounded-lg shadow-lg">
                                            <div className="border-b-2 border-black pb-2 mb-2">
                                                <h2 className="text-xl font-bold uppercase leading-tight">{selectedClient?.name}</h2>
                                            </div>
                                            <div>
                                                <h1 className="text-4xl font-extrabold">{selectedClient?.id}_{vol.numero_sequencial}/{volumes.length}</h1>
                                                <p className="text-sm mt-4 text-right font-mono">{new Date().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Styles for Printing (Argox OS-214plus: 80mm width, 38x30mm labels) */}
                                <style>{`
                                    @media print {
                                        @page { margin: 0; size: auto; }
                                        html, body { background: white; color: black; margin: 0; padding: 0; width: 80mm; }
                                        
                                        /* Hide UI */
                                        .print\\:hidden, header, nav, button { display: none !important; }
                                        
                                        /* Grid Layout */
                                        .print-container {
                                            display: grid !important;
                                            grid-template-columns: 39mm 39mm; /* Sligtly larger than 38 to fill space */
                                            column-gap: 1mm;
                                            row-gap: 2mm;
                                            padding: 1mm;
                                            width: 100%;
                                        }

                                        /* Label Item */
                                        .label-item {
                                            width: 38mm;
                                            height: 30mm;
                                            border: 1px dotted #ccc; /* Helper border, maybe remove if not needed */
                                            padding: 2mm;
                                            display: flex;
                                            flex-direction: column;
                                            justify-content: space-between;
                                            overflow: hidden;
                                            page-break-inside: avoid;
                                            box-sizing: border-box;
                                            background: white;
                                        }
                                        
                                        /* Fonts */
                                        .label-client { font-size: 10px; font-weight: bold; line-height: 1.1; text-transform: uppercase; }
                                        .label-code { font-size: 20px; font-weight: 900; }
                                        .label-date { font-size: 8px; text-align: right; margin-top: 2px; }
                                    }
                                `}</style>

                                <div className="hidden print-container">
                                    {volumes.map(vol => (
                                        <div key={vol.id} className="label-item">
                                            <div className="border-b border-black pb-1 mb-1">
                                                <h2 className="label-client">{selectedClient?.name.substring(0, 50)}</h2>
                                            </div>
                                            <div>
                                                <h1 className="label-code">{selectedClient?.id}_{vol.numero_sequencial}/{volumes.length}</h1>
                                                <p className="label-date">{new Date().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
