export interface ProductDbItem {
  ean: string;
  referencia: string;
  nome: string;
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

export type AppScreen = 'dashboard' | 'upload' | 'clients' | 'conference' | 'reports' | 'settings' | 'loads';