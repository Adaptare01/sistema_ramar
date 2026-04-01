-- ============================================================
-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS - SISTEMA RAMAR
-- Banco: ramar_sistema
-- Execute na primeira instalação para criar todas as tabelas.
-- ============================================================

BEGIN;

-- 1. Tabela de Cargas (importações de XML)
CREATE TABLE IF NOT EXISTS cargas (
    id UUID PRIMARY KEY,
    nome_arquivo TEXT,
    status TEXT DEFAULT 'ABERTO',
    total_itens NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    data_importacao TIMESTAMP DEFAULT NOW(),
    xml_hash VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_cargas_hash ON cargas(xml_hash);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(255) PRIMARY KEY,
    nome TEXT
);

-- 3. Tabela de Produtos (catálogo EAN ↔ Referência)
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY,
    referencia TEXT UNIQUE,
    descricao TEXT,
    ean TEXT,
    nome TEXT
);

-- 4. Tabela de Itens da Carga (produtos esperados por cliente)
CREATE TABLE IF NOT EXISTS carga_itens (
    id UUID PRIMARY KEY,
    carga_id UUID REFERENCES cargas(id),
    cliente_id VARCHAR(255) REFERENCES clientes(id),
    produto_referencia TEXT,
    produto_nome TEXT,
    quantidade_esperada NUMERIC,
    unidade TEXT
);

-- 5. Tabela de Volumes (caixas)
CREATE TABLE IF NOT EXISTS volumes (
    id UUID PRIMARY KEY,
    carga_id UUID REFERENCES cargas(id),
    cliente_id VARCHAR(255) REFERENCES clientes(id),
    numero_sequencial INTEGER,
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- 6. Tabela de Itens do Volume (produtos bipados)
CREATE TABLE IF NOT EXISTS volume_itens (
    id UUID PRIMARY KEY,
    volume_id UUID REFERENCES volumes(id),
    produto_ean TEXT,
    produto_referencia TEXT,
    quantidade NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Tabela de Conferências Finalizadas
CREATE TABLE IF NOT EXISTS conferencias (
    id UUID PRIMARY KEY,
    carga_id UUID NOT NULL REFERENCES cargas(id),
    cliente_id VARCHAR(255) NOT NULL REFERENCES clientes(id),
    status TEXT DEFAULT 'FINALIZADA',
    resumo JSONB,
    report_snapshot JSONB,
    faturado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
