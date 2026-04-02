'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Truck, Plus, Edit2, Trash2, MapPin, Calendar, Loader2,
    X, Save, BarChart3, Filter
} from 'lucide-react';

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface CaminhaoData {
    id: string;
    placa: string;
    modelo: string | null;
    condutor: string | null;
    ativo: boolean;
    _count: { viagens: number };
}

interface ViagemData {
    id: string;
    caminhaoId: string;
    data: string;
    kmSaida: number;
    kmChegada: number | null;
    kmPercorrido: number | null;
    placa: string;
    modelo: string | null;
    condutor: string | null;
    observacoes: string | null;
}

type Tab = 'caminhoes' | 'viagens' | 'relatorio';

export default function FrotaPage() {
    const [tab, setTab] = useState<Tab>('caminhoes');
    const [caminhoes, setCaminhoes] = useState<CaminhaoData[]>([]);
    const [viagens, setViagens] = useState<ViagemData[]>([]);
    const [loading, setLoading] = useState(true);

    // Caminhão form
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formPlaca, setFormPlaca] = useState('');
    const [formModelo, setFormModelo] = useState('');
    const [formCondutor, setFormCondutor] = useState('');

    // Relatório filters
    const [rCaminhaoId, setRCaminhaoId] = useState('');
    const [rMes, setRMes] = useState('');
    const [rAno, setRAno] = useState('');

    // Viagem form
    const [showViagemForm, setShowViagemForm] = useState(false);
    const [editViagemId, setEditViagemId] = useState<string | null>(null);
    const [vCaminhaoId, setVCaminhaoId] = useState('');
    const [vData, setVData] = useState(new Date().toISOString().split('T')[0]);
    const [vKmSaida, setVKmSaida] = useState('');
    const [vKmChegada, setVKmChegada] = useState('');
    const [vObs, setVObs] = useState('');

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, vRes] = await Promise.all([
                fetch('/api/caminhoes'),
                fetch('/api/viagens'),
            ]);
            setCaminhoes(await cRes.json());
            setViagens(await vRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // ─── Caminhão CRUD ───
    function openNewCaminhao() {
        setEditId(null);
        setFormPlaca('');
        setFormModelo('');
        setFormCondutor('');
        setShowForm(true);
    }

    function openEditCaminhao(c: CaminhaoData) {
        setEditId(c.id);
        setFormPlaca(c.placa);
        setFormModelo(c.modelo || '');
        setFormCondutor(c.condutor || '');
        setShowForm(true);
    }

    async function saveCaminhao() {
        const body = { placa: formPlaca, modelo: formModelo, condutor: formCondutor };
        const url = editId ? `/api/caminhoes/${editId}` : '/api/caminhoes';
        const method = editId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { alert(data.error); return; }
        setShowForm(false);
        loadAll();
    }

    async function deleteCaminhao(id: string) {
        if (!confirm('Excluir este caminhão e todas as suas viagens?')) return;
        await fetch(`/api/caminhoes/${id}`, { method: 'DELETE' });
        loadAll();
    }

    // ─── Viagem CRUD ───
    function openNewViagem() {
        setEditViagemId(null);
        setVCaminhaoId(caminhoes[0]?.id || '');
        setVData(new Date().toISOString().split('T')[0]);
        setVKmSaida('');
        setVKmChegada('');
        setVObs('');
        setShowViagemForm(true);
    }

    function openEditViagem(v: ViagemData) {
        setEditViagemId(v.id);
        setVCaminhaoId(v.caminhaoId);
        setVData(new Date(v.data).toISOString().split('T')[0]);
        setVKmSaida(String(v.kmSaida));
        setVKmChegada(v.kmChegada !== null ? String(v.kmChegada) : '');
        setVObs(v.observacoes || '');
        setShowViagemForm(true);
    }

    async function saveViagem() {
        const body = {
            caminhaoId: vCaminhaoId,
            data: vData,
            kmSaida: parseFloat(vKmSaida),
            kmChegada: vKmChegada ? parseFloat(vKmChegada) : null,
            observacoes: vObs,
        };
        const url = editViagemId ? `/api/viagens/${editViagemId}` : '/api/viagens';
        const method = editViagemId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { alert(data.error); return; }
        setShowViagemForm(false);
        setEditViagemId(null);
        loadAll();
    }

    async function deleteViagem(id: string) {
        if (!confirm('Excluir esta viagem?')) return;
        await fetch(`/api/viagens/${id}`, { method: 'DELETE' });
        loadAll();
    }

    // ─── Relatório (com filtros) ───
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
    const hasRelFilter = rCaminhaoId || rMes || rAno;

    const viagensByTruck = useMemo(() => {
        // First filter viagens by date
        let filtered = viagens;
        if (rMes || rAno) {
            filtered = viagens.filter(v => {
                const d = new Date(v.data);
                if (rAno && d.getFullYear() !== parseInt(rAno)) return false;
                if (rMes && (d.getMonth() + 1) !== parseInt(rMes)) return false;
                return true;
            });
        }

        // Then filter by caminhao
        const truckList = rCaminhaoId
            ? caminhoes.filter(c => c.id === rCaminhaoId)
            : caminhoes;

        return truckList.map(c => {
            const trips = filtered.filter(v => v.caminhaoId === c.id);
            const totalKm = trips.reduce((acc, v) => acc + (v.kmPercorrido || 0), 0);
            return { ...c, trips, totalKm };
        }).filter(c => c.trips.length > 0);
    }, [viagens, caminhoes, rCaminhaoId, rMes, rAno]);

    const totalGeralKm = useMemo(() =>
        viagensByTruck.reduce((acc, t) => acc + t.totalKm, 0),
        [viagensByTruck]
    );

    const TABS: { key: Tab; label: string }[] = [
        { key: 'caminhoes', label: 'Caminhões' },
        { key: 'viagens', label: 'Viagens' },
        { key: 'relatorio', label: 'Relatório KM' },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-gray-900">Controle de Frota</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${tab === t.key
                            ? 'text-primary border-primary bg-primary/5'
                            : 'text-gray-600 border-transparent hover:text-primary'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <>
                    {/* ═══════ TAB: CAMINHÕES ═══════ */}
                    {tab === 'caminhoes' && (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <button onClick={openNewCaminhao} className="btn-primary text-sm flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Novo Caminhão
                                </button>
                            </div>

                            {caminhoes.length === 0 ? (
                                <div className="card text-center py-12">
                                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">Nenhum caminhão cadastrado</p>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {caminhoes.map(c => (
                                        <div key={c.id} className="card">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 font-mono">{c.placa}</h3>
                                                    {c.modelo && <p className="text-sm text-gray-500">{c.modelo}</p>}
                                                    {c.condutor && <p className="text-sm text-gray-500">👤 {c.condutor}</p>}
                                                    <p className="text-xs text-gray-400 mt-1">{c._count.viagens} viagens</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditCaminhao(c)} className="p-1.5 text-gray-400 hover:text-primary rounded">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteCaminhao(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════ TAB: VIAGENS ═══════ */}
                    {tab === 'viagens' && (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <button
                                    onClick={openNewViagem}
                                    disabled={caminhoes.length === 0}
                                    className="btn-primary text-sm flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" /> Registrar Viagem
                                </button>
                            </div>

                            {caminhoes.length === 0 && (
                                <div className="card text-center py-8 text-sm text-amber-600 bg-amber-50 border border-amber-200">
                                    Cadastre um caminhão primeiro na aba &quot;Caminhões&quot;
                                </div>
                            )}

                            {viagens.length === 0 ? (
                                <div className="card text-center py-12">
                                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">Nenhuma viagem registrada</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {viagens.map(v => (
                                        <div key={v.id} className="card flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-bold text-sm">{v.placa}</span>
                                                    <span className="text-xs text-gray-400">
                                                        <Calendar className="w-3 h-3 inline mr-1" />
                                                        {new Date(v.data).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1 text-sm">
                                                    <span className="text-gray-500">Saída: <strong>{v.kmSaida.toLocaleString()} km</strong></span>
                                                    {v.kmChegada !== null && (
                                                        <>
                                                            <span className="text-gray-500">Chegada: <strong>{v.kmChegada.toLocaleString()} km</strong></span>
                                                            <span className="text-primary font-bold">{v.kmPercorrido?.toLocaleString()} km</span>
                                                        </>
                                                    )}
                                                </div>
                                                {v.observacoes && <p className="text-xs text-gray-400 mt-0.5">{v.observacoes}</p>}
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openEditViagem(v)} className="p-1.5 text-gray-400 hover:text-primary rounded" title="Editar">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteViagem(v.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Excluir">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════ TAB: RELATÓRIO ═══════ */}
                    {tab === 'relatorio' && (
                        <div className="space-y-4">
                            {/* Filtros */}
                            <div className="card">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-600">Filtros:</span>

                                    <select
                                        value={rCaminhaoId}
                                        onChange={e => setRCaminhaoId(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">Todos os caminhões</option>
                                        {caminhoes.map(c => (
                                            <option key={c.id} value={c.id}>{c.placa} - {c.condutor || c.modelo || ''}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={rMes}
                                        onChange={e => setRMes(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">Todos os meses</option>
                                        {MESES.map((m, i) => (
                                            <option key={i} value={String(i + 1)}>{m}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={rAno}
                                        onChange={e => setRAno(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">Todos os anos</option>
                                        {yearOptions.map(y => (
                                            <option key={y} value={String(y)}>{y}</option>
                                        ))}
                                    </select>

                                    {hasRelFilter && (
                                        <button
                                            onClick={() => { setRCaminhaoId(''); setRMes(''); setRAno(''); }}
                                            className="text-xs text-primary hover:underline font-medium"
                                        >
                                            Limpar filtros
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Total Geral */}
                            {viagensByTruck.length > 0 && (
                                <div className="card bg-primary/5 border border-primary/20 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                        🚛 {viagensByTruck.length} caminhão(ões) • {viagensByTruck.reduce((a, t) => a + t.trips.length, 0)} viagem(ns)
                                    </span>
                                    <span className="text-lg font-bold text-primary">{totalGeralKm.toLocaleString()} km total</span>
                                </div>
                            )}

                            {viagensByTruck.length === 0 ? (
                                <div className="card text-center py-12">
                                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">Nenhuma viagem para exibir</p>
                                </div>
                            ) : (
                                viagensByTruck.map(truck => (
                                    <div key={truck.id} className="card overflow-hidden p-0">
                                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                                            <div>
                                                <span className="font-mono font-bold text-gray-900">{truck.placa}</span>
                                                {truck.modelo && <span className="text-sm text-gray-500 ml-2">{truck.modelo}</span>}
                                                {truck.condutor && <span className="text-sm text-gray-500 ml-2">• {truck.condutor}</span>}
                                            </div>
                                            <span className="text-sm font-bold text-primary">{truck.totalKm.toLocaleString()} km total</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50/50">
                                                        <th className="px-4 py-2">Data</th>
                                                        <th className="px-4 py-2 text-right">KM Saída</th>
                                                        <th className="px-4 py-2 text-right">KM Chegada</th>
                                                        <th className="px-4 py-2 text-right">KM Percorrido</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {truck.trips.map(trip => (
                                                        <tr key={trip.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2">{new Date(trip.data).toLocaleDateString('pt-BR')}</td>
                                                            <td className="px-4 py-2 text-right">{trip.kmSaida.toLocaleString()}</td>
                                                            <td className="px-4 py-2 text-right">{trip.kmChegada?.toLocaleString() || '--'}</td>
                                                            <td className="px-4 py-2 text-right font-bold text-primary">
                                                                {trip.kmPercorrido ? `${trip.kmPercorrido.toLocaleString()} km` : '--'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-gray-50 font-bold">
                                                        <td className="px-4 py-2" colSpan={3}>Total</td>
                                                        <td className="px-4 py-2 text-right text-primary">{truck.totalKm.toLocaleString()} km</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ═══════ MODAL: NOVO/EDITAR CAMINHÃO ═══════ */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">{editId ? 'Editar Caminhão' : 'Novo Caminhão'}</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-600 block mb-1">Placa *</label>
                                <input value={formPlaca} onChange={e => setFormPlaca(e.target.value)} placeholder="ABC-1234"
                                    className="input-field uppercase font-mono" maxLength={10} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 block mb-1">Modelo</label>
                                <input value={formModelo} onChange={e => setFormModelo(e.target.value)} placeholder="Ex: VW Constellation"
                                    className="input-field" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 block mb-1">Condutor</label>
                                <input value={formCondutor} onChange={e => setFormCondutor(e.target.value)} placeholder="Nome do motorista"
                                    className="input-field" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold">
                                Cancelar
                            </button>
                            <button onClick={saveCaminhao} disabled={!formPlaca.trim()} className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ MODAL: REGISTRAR VIAGEM ═══════ */}
            {showViagemForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">{editViagemId ? 'Editar Viagem' : 'Registrar Viagem'}</h2>
                            <button onClick={() => setShowViagemForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-600 block mb-1">Caminhão *</label>
                                <select value={vCaminhaoId} onChange={e => setVCaminhaoId(e.target.value)}
                                    className="input-field">
                                    {caminhoes.map(c => (
                                        <option key={c.id} value={c.id}>{c.placa} - {c.condutor || c.modelo || ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 block mb-1">Data *</label>
                                <input type="date" value={vData} onChange={e => setVData(e.target.value)}
                                    className="input-field" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-gray-600 block mb-1">KM Saída *</label>
                                    <input type="number" value={vKmSaida} onChange={e => setVKmSaida(e.target.value)}
                                        placeholder="0" className="input-field" />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 block mb-1">KM Chegada</label>
                                    <input type="number" value={vKmChegada} onChange={e => setVKmChegada(e.target.value)}
                                        placeholder="0" className="input-field" />
                                </div>
                            </div>
                            {vKmSaida && vKmChegada && (
                                <div className="bg-primary/5 rounded-lg p-3 text-center">
                                    <p className="text-xs text-gray-500">KM Percorrido</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {(parseFloat(vKmChegada) - parseFloat(vKmSaida)).toLocaleString()} km
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm text-gray-600 block mb-1">Observações</label>
                                <input value={vObs} onChange={e => setVObs(e.target.value)}
                                    placeholder="Ex: Entrega para São Paulo" className="input-field" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowViagemForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold">
                                Cancelar
                            </button>
                            <button onClick={saveViagem} disabled={!vCaminhaoId || !vData || !vKmSaida}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
