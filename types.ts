export interface ProductDbItem {
  id: string;
  ean: string;
  referencia: string;
  nome: string;
  descricao: string;
}

export interface InvoiceItem {
  referencia: string;
  nome: string;
  quantidadeEsperada: number;
  unidade: string;
}

export interface ClientData {
  id: string;
  name: string;
  items: InvoiceItem[];
  totalItems: number; // Sum of quantities
  totalScanned?: number;
  isCompleted?: boolean;
  reportId?: string;
  hasReservations?: boolean;
}

export interface ScannedItem {
  id?: string; // UUID do banco
  ean: string;
  referencia: string;
  nome: string;
  timestamp: number;
  quantity: number; // Novo campo para suportar múltiplas unidades de uma vez
}

export interface Volume {
  id: number;
  uuid: string; // Database ID for operations
  isOpen: boolean;
  items: ScannedItem[];
}

export type AppScreen = 'dashboard' | 'upload' | 'clients' | 'conference' | 'loads' | 'reports' | 'settings' | 'labels' | 'finished_loads' | 'conference_report';