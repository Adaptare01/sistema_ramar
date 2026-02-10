import React, { useState } from 'react';
import { AppScreen, ClientData } from './types';
import { api } from './services/api';
import { Layout } from './components/Layout';
import { DashboardScreen } from './screens/DashboardScreen';
import { UploadScreen } from './screens/UploadScreen';
import { ClientListScreen } from './screens/ClientListScreen';
import { VerificationScreen } from './screens/VerificationScreen';


import { LoadListScreen } from './screens/LoadListScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { LabelScreen } from './screens/LabelScreen';
import { FinishedLoadsScreen } from './screens/FinishedLoadsScreen';
import { ConferenceReportScreen } from './screens/ConferenceReportScreen';

export default function App() {
    const [screen, setScreen] = useState<AppScreen | 'finished_loads' | 'conference_report'>('dashboard');
    const [clients, setClients] = useState<ClientData[]>([]);
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [cargaId, setCargaId] = useState<string | null>(null);
    const [reportId, setReportId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // XML Processing Logic
    const handleProcessFile = async (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                try {
                    // Call Backend API
                    const result = await api.importXML(text, file.name);

                    if (result.data.clients.length === 0) {
                        alert("Nenhum cliente encontrado no XML.");
                    } else {
                        setClients(result.data.clients);
                        setCargaId(result.data.cargaId);
                        setScreen('clients');
                    }
                } catch (err: any) {
                    console.error(err);
                    alert(`Erro na importação: ${err.message}`);
                } finally {
                    setIsProcessing(false);
                }
            }
        };
        reader.onerror = () => {
            alert("Erro ao ler o arquivo.");
            setIsProcessing(false);
        }
        reader.readAsText(file);
    };

    const handleSelectClient = (client: ClientData) => {
        setSelectedClient(client);
        setScreen('conference');
    };

    const handleSelectCarga = async (selectedCargaId: string) => {
        setIsProcessing(true);
        try {
            const data = await api.getClientsForCarga(selectedCargaId);
            setCargaId(data.cargaId);
            setClients(data.clients);
            setScreen('clients');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNavigate = (target: AppScreen) => {
        // Safety checks
        if (screen === 'conference' && target !== 'conference') {
            if (!window.confirm("Sair da conferência? O progresso não salvo será perdido.")) {
                return;
            }
        }
        setScreen(target);
    };

    const renderScreen = () => {
        switch (screen) {
            case 'dashboard':
                return <DashboardScreen onNavigate={setScreen} />;
            case 'upload':
                return <UploadScreen onProcess={handleProcessFile} isProcessing={isProcessing} />;
            case 'clients':
                return <ClientListScreen
                    clients={clients}
                    onSelect={handleSelectClient}
                    onViewReport={(id) => { setReportId(id); setScreen('conference_report'); }}
                />;
            case 'conference':
                if (!selectedClient || !cargaId) return <DashboardScreen onNavigate={setScreen} />;
                return <VerificationScreen client={selectedClient} cargaId={cargaId} onBack={() => setScreen('clients')} />;
            case 'loads':
                return <LoadListScreen onSelect={handleSelectCarga} />;
            case 'reports':
                return <div className="p-8 text-center text-gray-500">Módulo de Relatórios em Breve</div>;
            case 'settings':
                return <ConfigScreen onBack={() => setScreen('dashboard')} />;
            case 'labels':
                return <LabelScreen onBack={() => setScreen('dashboard')} />;
            case 'finished_loads':
                return <FinishedLoadsScreen
                    onBack={() => setScreen('dashboard')}
                    onSelectConference={(id) => { setReportId(id); setScreen('conference_report'); }}
                />;
            case 'conference_report':
                if (!reportId) return <FinishedLoadsScreen
                    onBack={() => setScreen('dashboard')}
                    onSelectConference={(id) => { setReportId(id); setScreen('conference_report'); }}
                />;
                return <ConferenceReportScreen conferenceId={reportId} onBack={() => setScreen('finished_loads')} />;
            default:
                return <DashboardScreen onNavigate={setScreen} />;
        }
    };

    return (
        <Layout currentScreen={screen} onNavigate={handleNavigate}>
            {renderScreen()}
        </Layout>
    );
}