# 🏗️ Guia Mestre de Construção de Sistemas — Adaptare Software

**Versão:** 2.0 — Março 2026  
**Baseado em:** Experiência real do CRM Madeleco (madeleco.adaptare.ia.br)  
**Objetivo:** Ser a **fonte única da verdade** para construir qualquer novo sistema no ecossistema Adaptare, evitando desperdício de tempo, dinheiro e tokens de IA.

> ⚠️ **INSTRUÇÃO PARA AGENTES DE IA**: Leia este documento **INTEIRO** antes de iniciar qualquer novo projeto. Cada seção contém armadilhas reais que custaram horas de debug. O não cumprimento dessas diretrizes resultará em erros já conhecidos e documentados.

---

## 📋 Índice

1. [Stack Tecnológica Padrão](#1-stack-tecnológica-padrão)
2. [Infraestrutura do Servidor (VPS + Docker Swarm)](#2-infraestrutura-do-servidor)
3. [Cloudflare — Configuração Completa de DNS e SSL](#3-cloudflare--configuração-completa-de-dns-e-ssl)
4. [Traefik — Reverse Proxy e Roteamento](#4-traefik--reverse-proxy-e-roteamento)
5. [Banco de Dados PostgreSQL](#5-banco-de-dados-postgresql)
6. [Estrutura da Aplicação Next.js](#6-estrutura-da-aplicação-nextjs)
7. [Dockerfile e docker-compose.yml](#7-dockerfile-e-docker-composeyml)
8. [CI/CD — GitHub Actions + GHCR](#8-cicd--github-actions--ghcr)
9. [Integração com N8N (Webhooks)](#9-integração-com-n8n-webhooks)
10. [Checklist Completo — Do Zero ao Deploy](#10-checklist-completo--do-zero-ao-deploy)
11. [Hall of Shame — Erros Conhecidos e Soluções](#11-hall-of-shame--erros-conhecidos-e-soluções)
12. [Comandos de Diagnóstico Rápido](#12-comandos-de-diagnóstico-rápido)
13. [Referência Rápida — Tabela de Dados](#13-referência-rápida--tabela-de-dados)

---

## 1. Stack Tecnológica Padrão

### 1.1 Diagrama do Fluxo Completo

```
Usuário (navegador)
    │
    │  HTTPS (443)
    ▼
Cloudflare (DNS + Proxy + SSL)
    │
    │  HTTP (80) ou HTTPS (443) dependendo da zona
    ▼
VPS Hostinger KVM4 — IP: 31.97.19.108
Ubuntu 24.04 LTS — Docker Swarm (Single Node)
    │
    ▼
Traefik v2.9 (Reverse Proxy)
    │  Lê roteamento de: /opt/traefik/config/dynamic.yml
    │
    ├──► Aplicação Next.js (porta 3000)
    │       │
    │       ├── Frontend (React SSR)
    │       ├── API Routes (/api/*)
    │       └── Webhook Routes (/api/webhook/*)
    │               │
    │               ▼
    │           N8N (automações via webhook)
    │
    └──► PostgreSQL (porta 5432, rede interna)
            │
            └── Prisma ORM (consultas tipadas)
```

### 1.2 Tecnologias e Versões Fixas

| Tecnologia | Versão | Motivo |
|-----------|--------|--------|
| **Node.js** | 22-alpine | LTS mais recente com suporte a Web Crypto API |
| **Next.js** | 15+ (App Router) | Framework fullstack com SSR e API Routes |
| **Prisma** | **v5.22.0** | ⚠️ v7 causa `PrismaClientConstructorValidationError` — **NÃO ATUALIZAR** |
| **PostgreSQL** | 16 | Banco relacional principal |
| **Docker** | Swarm Mode | Orquestração com zero downtime deploy |
| **Traefik** | v2.9 | Reverse proxy com file provider |
| **Cloudflare** | — | DNS, proxy, SSL, proteção DDoS |
| **GitHub Actions** | — | CI/CD (build + deploy automático) |
| **GHCR** | — | GitHub Container Registry (armazenamento de imagens Docker) |
| **N8N** | — | Automação de workflows (WhatsApp, IA, etc.) |
| **Tailwind CSS** | 3+ | Estilização |
| **@paralleldrive/cuid2** | — | Geração de IDs únicos (substitui uuid) |

### 1.3 Dependências NPM Obrigatórias

```json
{
  "dependencies": {
    "next": "^15.x",
    "@prisma/client": "5.22.0",
    "@paralleldrive/cuid2": "^2.x"
  },
  "devDependencies": {
    "prisma": "5.22.0",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "@types/node": "^22.x",
    "@types/react": "^19.x"
  }
}
```

---

## 2. Infraestrutura do Servidor

### 2.1 Dados do Servidor

| Item | Valor |
|------|-------|
| **IP** | `31.97.19.108` |
| **OS** | Ubuntu 24.04 LTS |
| **Provedor** | Hostinger KVM4 |
| **Docker** | Swarm Mode (single node) |
| **Node Swarm** | `srv828712` |
| **Diretório base** | `/opt/` |
| **Traefik config** | `/opt/traefik/config/dynamic.yml` |

### 2.2 Redes Docker Overlay

O servidor tem **3 redes overlay** — usar a rede correta é CRÍTICO:

| Rede | Tipo | Quando Usar |
|------|------|------------|
| `proxy` | overlay, external | **OBRIGATÓRIO** — Para Traefik rotear o tráfego para o container |
| `adaptare` | overlay, external | **OBRIGATÓRIO** — Para o container acessar o banco de dados |
| `traefik` | overlay (interna) | **NUNCA USAR** — Rede interna do Traefik, não é attachable |

### 2.3 Serviços Existentes na Rede `adaptare`

| Serviço Docker | Hostname Interno | Porta | Uso |
|----------------|-----------------|-------|-----|
| `infra-adaptare_db_adaptare` | `infra-adaptare_db_adaptare` | `5432` | PostgreSQL principal |
| `postgres_postgres` | `postgres_postgres` | `5432` | PostgreSQL secundário |
| `redis_redis` | `redis_redis` | `6379` | Cache Redis |
| `n8n_n8n` | `n8n_n8n` | `5678` | N8N automações |

### 2.4 Serviços Existentes na Rede `proxy` (roteados pelo Traefik)

| Subdomínio | Serviço |
|-----------|---------|
| `n8n.adaptaresoftware.com.br` | N8N |
| `pgadmin.adaptaresoftware.com.br` | pgAdmin |
| `portainer.adaptaresoftware.com.br` | Portainer |
| `grafana.adaptaresoftware.com.br` | Grafana |
| `prometheus.adaptaresoftware.com.br` | Prometheus |
| `madeleco.adaptare.ia.br` | CRM Madeleco |

### 2.5 Regra de Ouro: Hostnames Docker

```
⛔ ERRADO: DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/banco"
⛔ ERRADO: DATABASE_URL="postgresql://user:pass@localhost:5432/banco"
✅ CERTO:  DATABASE_URL="postgresql://user:pass@infra-adaptare_db_adaptare:5432/banco"
```

> Dentro de um container Docker Swarm, `127.0.0.1` aponta para o **próprio container**, não para o host. Use SEMPRE o hostname do serviço Swarm.

---

## 3. Cloudflare — Configuração Completa de DNS e SSL

### 3.1 Visão Geral

O Cloudflare é o ponto de entrada de TODO o tráfego. Ele age como:
- **DNS autoritativo** — resolve o domínio para o IP da VPS
- **Proxy reverso** — protege o IP real da VPS
- **Provedor SSL** — criptografa a conexão do usuário final
- **Proteção DDoS** — filtra tráfego malicioso
- **CDN** — cacheia assets estáticos

### 3.2 Zonas DNS Existentes

| Zona | Uso | SSL Mode |
|------|-----|----------|
| `adaptare.ia.br` | Sistemas de **clientes** (ex: madeleco.adaptare.ia.br) | **Flexible** |
| `adaptaresoftware.com.br` | Ferramentas **internas** (n8n, pgAdmin, etc.) | **Full (Strict)** |

### 3.3 Cenário A: Subdomínio em `*.adaptare.ia.br` (PADRÃO para clientes)

Este é o cenário mais simples e recomendado para novos projetos de clientes.

#### Passo 1 — Criar registro DNS

1. Acesse **dash.cloudflare.com** → Selecione a zona `adaptare.ia.br`
2. Vá em **DNS → Records → Add record**
3. Configure:

| Campo | Valor | Obs |
|-------|-------|-----|
| Type | `A` | Aponta para IPv4 |
| Name | `nome-do-projeto` | Ex: `madeleco` → vira `madeleco.adaptare.ia.br` |
| IPv4 address | `31.97.19.108` | IP da VPS |
| Proxy status | **Proxied** ☁️ | Nuvem **laranja** (OBRIGATÓRIO) |
| TTL | Auto | Cloudflare gerencia |

4. Clique **Save**

#### Passo 2 — Configurar SSL/TLS

1. Vá em **SSL/TLS → Overview**
2. Certifique-se que o modo é **Flexible**

```
┌─────────────────────────────────────────────────────────┐
│  O que "Flexible" significa:                            │
│                                                          │
│  Usuário ──HTTPS──► Cloudflare ──HTTP──► VPS (porta 80) │
│                                                          │
│  ✅ Usuário final vê HTTPS (cadeado verde)              │
│  ✅ Cloudflare protege a conexão pública                │
│  ⚠️ Tráfego Cloudflare→VPS vai em HTTP (OK para VPS    │
│     privada, pois IP real está escondido pelo proxy)    │
└─────────────────────────────────────────────────────────┘
```

#### Passo 3 — Configurar Edge Certificates

1. Vá em **SSL/TLS → Edge Certificates**
2. Ative:
   - **Always Use HTTPS**: ✅ ON
   - **Automatic HTTPS Rewrites**: ✅ ON
   - **Minimum TLS Version**: `TLS 1.2`

#### Passo 4 — Configurar HSTS (após confirmar que HTTPS funciona)

1. Vá em **SSL/TLS → Edge Certificates → HSTS**
2. Ative com:
   - **Status**: Enabled
   - **Max Age**: 6 months (15768000)
   - **Include subdomains**: ✅ ON
   - **No-Sniff**: ✅ ON

> ⚠️ **ATENÇÃO**: Só ative HSTS **depois** de confirmar que o site funciona em HTTPS. Ativar antes pode travar o acesso ao site por até 6 meses se algo der errado.

#### Passo 5 — Traefik (no servidor)

O Traefik recebe na porta 80 (entrypoint `web`):

```yaml
# Em /opt/traefik/config/dynamic.yml
http:
  routers:
    nome-projeto:
      rule: "Host(`nome-projeto.adaptare.ia.br`)"
      entryPoints:
        - web          # ← porta 80, HTTP
      service: nome-projeto

  services:
    nome-projeto:
      loadBalancer:
        servers:
          - url: "http://stack_servico:3000"
```

---

### 3.4 Cenário B: Subdomínio em `*.adaptaresoftware.com.br` (ferramentas internas)

Para ferramentas internas da Adaptare (n8n, pgAdmin, Grafana, etc.).

#### Diferenças do Cenário A:

| Aspecto | Cenário A (adaptare.ia.br) | Cenário B (adaptaresoftware.com.br) |
|---------|---------------------------|-------------------------------------|
| SSL Mode | Flexible | Full (Strict) |
| Traefik entrypoint | `web` (80) | `websecure` (443) |
| Certificado no servidor | Não necessário | Let's Encrypt via DNS Challenge |
| Segurança | Boa | Máxima (end-to-end) |

#### Configuração do Traefik para `websecure`:

```yaml
http:
  routers:
    ferramenta:
      rule: "Host(`ferramenta.adaptaresoftware.com.br`)"
      entryPoints:
        - websecure     # ← porta 443, HTTPS
      tls:
        certResolver: letsencrypt
      service: ferramenta
```

> O Traefik já está configurado com o certResolver `letsencrypt` usando DNS Challenge via Cloudflare API Token (`CF_DNS_API_TOKEN`). Os certificados são emitidos e renovados automaticamente.

---

### 3.5 Cenário C: Domínio Próprio do Cliente

Quando o cliente quer usar seu próprio domínio (ex: `sistema.clientexyz.com.br`).

#### Opção C1 — Cliente transfere DNS para Cloudflare (RECOMENDADO)

1. O cliente adiciona a zona `clientexyz.com.br` no Cloudflare
2. O cliente troca os nameservers no registrador para os da Cloudflare
3. Configuramos o registro A igual ao Cenário A
4. SSL Mode: **Flexible**
5. Traefik: entrypoint `web` (porta 80)

**Vantagem**: Controle total, proteção DDoS, CDN.  
**Desvantagem**: Cliente precisa mudar nameservers.

#### Opção C2 — Cliente mantém DNS atual + CNAME

1. O cliente cria no seu DNS:
   ```
   sistema.clientexyz.com.br  CNAME  nome-projeto.adaptare.ia.br
   ```
2. No Cloudflare (`adaptare.ia.br`), o registro A já existente resolve
3. No Traefik, adicionar o domínio do cliente como regra alternativa:

```yaml
http:
  routers:
    nome-projeto:
      rule: "Host(`nome-projeto.adaptare.ia.br`) || Host(`sistema.clientexyz.com.br`)"
      entryPoints:
        - web
      service: nome-projeto
```

**Vantagem**: Simples para o cliente.  
**Desvantagem**: SSL depende da configuração do DNS do cliente; CNAME para apex domain não funciona em alguns provedores.

#### Opção C3 — Cliente mantém DNS + registro A direto

1. O cliente cria no seu DNS:
   ```
   sistema.clientexyz.com.br  A  31.97.19.108
   ```
2. Sem proxy Cloudflare — o IP fica exposto
3. O Traefik emite certificado Let's Encrypt via **HTTP Challenge** (porta 80):

```yaml
http:
  routers:
    cliente-xyz:
      rule: "Host(`sistema.clientexyz.com.br`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt    # Emite certificado automaticamente
      service: nome-projeto
```

**Vantagem**: Funciona com qualquer provedor DNS.  
**Desvantagem**: IP exposto, sem proteção Cloudflare. O Traefik precisa ter HTTP Challenge habilitado no `traefik.yml`.

> **Prazo de propagação DNS:**
> - Cloudflare: 1-5 minutos
> - Registro.br, GoDaddy, etc.: até 48 horas (normalmente 2-6h)

---

### 3.6 Configurações de Segurança no Cloudflare (aplicar em TODAS as zonas)

| Configuração | Caminho no Cloudflare | Valor | Motivo |
|-------------|----------------------|-------|--------|
| Always Use HTTPS | SSL/TLS → Edge Certificates | ✅ ON | Redireciona HTTP→HTTPS |
| Automatic HTTPS Rewrites | SSL/TLS → Edge Certificates | ✅ ON | Corrige links HTTP dentro da página |
| Minimum TLS Version | SSL/TLS → Edge Certificates | TLS 1.2 | Bloqueia protocolos inseguros |
| Bot Fight Mode | Security → Bots | ✅ ON | Protege APIs contra crawlers |
| Browser Integrity Check | Security → Settings | ✅ ON | Bloqueia requests com User-Agent inválido |
| Email Address Obfuscation | Scrape Shield | ✅ ON | Protege emails de scraping |

### 3.7 Armadilhas Cloudflare

| Armadilha | O que acontece | Solução |
|-----------|---------------|---------|
| Proxy **DESLIGADO** + SSL Flexible | `ERR_SSL_PROTOCOL_ERROR` no navegador | Ligar proxy (nuvem laranja) |
| SSL mode **Full** em `adaptare.ia.br` | 502 Bad Gateway (VPS não tem certificado nessa zona) | Mudar para **Flexible** |
| HSTS ativado antes de HTTPS funcionar | Site inacessível por até 6 meses | Só ativar HSTS após confirmar HTTPS |
| Cache agressivo em API routes | Respostas desatualizadas em `/api/*` | Criar Page Rule: `*adaptare.ia.br/api/*` → Cache Level: Bypass |
| IP real em logs | `X-Forwarded-For` pode ter IPs do Cloudflare | Usar header `CF-Connecting-IP` para IP real do visitante |
| Development Mode esquecido ligado | Expira em 3 horas; cache volta ao normal | Desligar manualmente após testes |

### 3.8 Page Rules Recomendadas (Cloudflare)

```
Regra 1: *adaptare.ia.br/api/*
  → Cache Level: Bypass
  → Motivo: API routes nunca devem ser cacheadas

Regra 2: *adaptare.ia.br/login*
  → Security Level: High
  → Motivo: Proteger página de login contra brute force

Regra 3: *adaptare.ia.br/*.js
  → Cache Level: Cache Everything
  → Edge Cache TTL: 1 month
  → Motivo: Assets estáticos do Next.js são imutáveis (hash no nome)
```

---

## 4. Traefik — Reverse Proxy e Roteamento

### 4.1 Arquitetura

O Traefik usa **dois providers** simultaneamente:

```yaml
# /opt/traefik/traefik.yml (configuração estática — NÃO EDITAR sem necessidade)
providers:
  docker:
    swarmMode: true
    network: proxy
  file:
    filename: /etc/traefik/config/dynamic.yml
    watch: true     # Recarrega automaticamente ao salvar
```

### 4.2 Regra de Ouro: Use APENAS o File Provider

**Para novos projetos, configure SEMPRE pelo `dynamic.yml`** e **NÃO adicione labels Traefik no `docker-compose.yml`**.

```
⛔ ERRADO (docker-compose.yml com labels):
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.app.rule=Host(`app.adaptare.ia.br`)"

✅ CERTO (dynamic.yml):
    Sem labels no docker-compose + rota definida no dynamic.yml
```

**Por quê?** Se labels Docker E o `dynamic.yml` coexistirem para o mesmo hostname, os dois providers criam routers conflitantes → Traefik retorna **404 sem motivo aparente**. Este bug custou 4+ horas de debug no projeto Madeleco.

### 4.3 Template de Novo Router/Service

```yaml
# /opt/traefik/config/dynamic.yml — adicionar nas seções corretas
http:
  routers:
    # ─── ROUTER para adaptare.ia.br (SSL Flexible) ───
    nome-projeto:
      rule: "Host(`nome-projeto.adaptare.ia.br`)"
      entryPoints:
        - web                    # porta 80
      service: nome-projeto

    # ─── ROUTER para domínio próprio do cliente (SSL Let's Encrypt) ───
    # nome-projeto-custom:
    #   rule: "Host(`sistema.cliente.com.br`)"
    #   entryPoints:
    #     - websecure            # porta 443
    #   tls:
    #     certResolver: letsencrypt
    #   service: nome-projeto

  services:
    nome-projeto:
      loadBalancer:
        servers:
          - url: "http://STACK_SERVICO:3000"   # Ex: http://madeleco_crm:3000
```

### 4.4 Nomenclatura

O hostname interno do Swarm segue o padrão: `{nome-da-stack}_{nome-do-serviço}`

| docker-compose.yml | docker stack deploy cmd | Hostname Swarm |
|---|---|---|
| serviço: `crm` | `docker stack deploy -c ... madeleco` | `madeleco_crm` |
| serviço: `app` | `docker stack deploy -c ... projeto-x` | `projeto-x_app` |

### 4.5 Após Editar o dynamic.yml

```bash
# O Traefik recarrega automaticamente (watch: true)
# Se não funcionar em ~10 segundos:
docker service update --force traefik_traefik

# Verificar se o Traefik leu a configuração:
docker service logs traefik_traefik --tail 30 2>&1 | grep -i "router\|error\|nome-projeto"
```

> ⚠️ Se o YAML tiver erro de sintaxe, o Traefik **ignora silenciosamente** o arquivo inteiro. Sempre valide o YAML antes de salvar.

---

## 5. Banco de Dados PostgreSQL

### 5.1 Banco Existente

O banco principal roda no serviço `infra-adaptare_db_adaptare` (rede `adaptare`).

| Aspecto | Valor |
|---------|-------|
| Hostname (Docker interno) | `infra-adaptare_db_adaptare` |
| Porta | `5432` |
| Usuário admin | `admin_adaptare` |
| Banco do CRM Madeleco | `madeleco_sistema` |
| Porta mapeada no host | `5433` (127.0.0.1 apenas) |

### 5.2 Criar Novo Banco para Novo Projeto

**Via SSH + psql:**
```bash
ssh root@31.97.19.108

# Entrar no container do PostgreSQL
docker exec -it $(docker ps --filter name=infra-adaptare_db_adaptare --format "{{.ID}}") psql -U admin_adaptare -d postgres

# Criar novo banco
CREATE DATABASE nome_do_banco;

# Verificar
\l

# Sair
\q
```

**Via pgAdmin** (mais fácil):
1. Acesse `https://pgadmin.adaptaresoftware.com.br`
2. Conecte ao servidor PostgreSQL
3. Crie o banco via interface gráfica

### 5.3 DATABASE_URL — Formato Correto

```
postgresql://USUARIO:SENHA@HOST:PORTA/BANCO?schema=public
```

**Exemplos:**

```env
# ✅ PRODUÇÃO (dentro do Docker Swarm):
DATABASE_URL="postgresql://admin_adaptare:Adaptare%2301@infra-adaptare_db_adaptare:5432/meu_banco"

# ✅ DESENVOLVIMENTO LOCAL (com túnel SSH ativo):
DATABASE_URL="postgresql://admin_adaptare:Adaptare%2301@127.0.0.1:5433/meu_banco?schema=public"

# ⛔ ERRADO (localhost no Windows causa timeout por IPv6):
DATABASE_URL="postgresql://admin_adaptare:Adaptare%2301@localhost:5433/meu_banco"

# ⛔ ERRADO (127.0.0.1 dentro do Docker aponta para o próprio container):
DATABASE_URL="postgresql://admin_adaptare:Adaptare%2301@127.0.0.1:5432/meu_banco"
```

### 5.4 Conexão Local via Túnel SSH

O banco NÃO está exposto publicamente. Para acessar durante desenvolvimento:

```powershell
# Terminal 1 — Abrir o túnel (manter aberto enquanto desenvolve):
ssh -L 5433:127.0.0.1:5433 root@31.97.19.108 -N
```

O `.env` local deve usar:
```env
DATABASE_URL="postgresql://admin_adaptare:Adaptare%2301@127.0.0.1:5433/nome_banco?schema=public"
```

> ⚠️ **NUNCA** use `localhost` — o Node.js no Windows pode resolver para IPv6 `::1` que não funciona com o túnel SSH IPv4. Use SEMPRE `127.0.0.1`.

### 5.5 Prisma — Setup Completo

#### Inicializar Prisma em novo projeto:
```bash
npm install prisma@5.22.0 @prisma/client@5.22.0
npx prisma init
```

#### Schema mínimo (`prisma/schema.prisma`):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Seus models aqui...
```

#### Singleton do Prisma Client (`src/lib/prisma.ts`):
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> O singleton evita que o Next.js em modo dev crie uma nova conexão a cada hot reload.

#### Comandos Prisma:
```bash
# Sincronizar schema com banco (dev — aceita perda de dados):
npx prisma db push

# Gerar client após mudar schema:
npx prisma generate

# Ver dados no navegador:
npx prisma studio

# ⚠️ Em produção, usar migrate (não db push):
npx prisma migrate deploy
```

### 5.6 Senha com Caracteres Especiais na URL

Se a senha contém caracteres especiais, use URL encoding:

| Caractere | URL Encoding |
|-----------|-------------|
| `#` | `%23` |
| `@` | `%40` |
| `!` | `%21` |
| `$` | `%24` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| ` ` (espaço) | `%20` |

Exemplo: `Adaptare#01` → `Adaptare%2301`

---

## 6. Estrutura da Aplicação Next.js

### 6.1 Estrutura de Diretórios Padrão

```
projeto/
├── .env                          # Variáveis locais (NUNCA commitar)
├── .env.production.example       # Template para produção
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── package.json
├── prisma/
│   └── schema.prisma
├── public/
│   └── (imagens, ícones)
└── src/
    ├── middleware.ts              # Autenticação + proteção de rotas
    ├── lib/
    │   ├── prisma.ts             # Singleton Prisma
    │   └── auth.ts               # Lógica de autenticação
    └── app/
        ├── globals.css
        ├── layout.tsx            # Layout raiz
        ├── login/
        │   └── page.tsx
        ├── (dashboard)/
        │   ├── layout.tsx        # Layout com sidebar
        │   ├── page.tsx          # Dashboard
        │   ├── clientes/
        │   ├── demandas/
        │   └── configuracoes/
        ├── api/
        │   ├── auth/
        │   │   ├── login/route.ts
        │   │   └── logout/route.ts
        │   ├── clients/
        │   │   ├── route.ts      # GET (listar) + POST (criar)
        │   │   └── [id]/route.ts # GET/PUT/DELETE por ID
        │   ├── leads/
        │   │   ├── route.ts
        │   │   └── [id]/route.ts
        │   ├── dashboard/
        │   │   └── route.ts
        │   └── webhook/          # Rotas públicas (sem autenticação de sessão)
        │       ├── clients/route.ts
        │       └── leads/route.ts
        └── orcamento/
            └── [id]/page.tsx     # Página pública de orçamento
```

### 6.2 Configuração Obrigatória do Next.js

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",    // ⚠️ OBRIGATÓRIO para Docker
};

export default nextConfig;
```

> Sem `output: "standalone"`, o build não gera o `server.js` que o Dockerfile precisa para rodar.

### 6.3 Rotas API — Padrão Obrigatório

Toda rota API deve ter:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";  // ⚠️ OBRIGATÓRIO — evita cache de API routes

export async function GET(request: NextRequest) {
  try {
    // ... lógica
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

> Sem `export const dynamic = "force-dynamic"`, o Next.js pode cachear a resposta da API e retornar dados desatualizados.

### 6.4 Autenticação — Padrão Simples (Usuário Único)

Para sistemas com poucos usuários, a autenticação é feita por:
1. **`src/lib/auth.ts`** — Credenciais hardcoded (hash SHA-256) + token de sessão pré-computado
2. **`src/middleware.ts`** — Verifica cookie `session` em todas as rotas protegidas
3. **`/api/auth/login`** — Valida credenciais e seta cookie
4. **`/api/auth/logout`** — Remove cookie

#### Rotas Públicas (sem autenticação):

No middleware, excluir rotas que devem ser acessíveis sem login:

```typescript
// src/middleware.ts
export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Rotas públicas — NÃO exigem autenticação
    if (
        pathname === '/login' ||
        pathname.startsWith('/api/auth/') ||
        pathname.startsWith('/api/webhook/') ||  // ← Webhooks do N8N
        pathname.startsWith('/orcamento/')        // ← Página pública
    ) {
        return NextResponse.next();
    }

    // Todas as outras rotas exigem sessão válida
    const token = req.cookies.get('session')?.value;
    if (!token || !verifySessionToken(token)) {
        return NextResponse.redirect(`${req.nextUrl.origin}/login`);
    }

    return NextResponse.next();
}
```

### 6.5 Webhook com API Key — Padrão de Segurança

As rotas webhook são públicas (sem sessão de usuário), mas protegidas por API Key:

```typescript
// Padrão para validar API Key do N8N
function validateApiKey(request: NextRequest): boolean {
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.N8N_API_KEY;

    if (!expectedKey) {
        console.error("N8N_API_KEY not configured");
        return false;
    }

    return apiKey === expectedKey;
}

export async function GET(request: NextRequest) {
    if (!validateApiKey(request)) {
        return NextResponse.json(
            { error: "Unauthorized - Invalid API key" },
            { status: 401 }
        );
    }
    // ... lógica
}
```

### 6.6 Tratamento de Telefone Brasileiro (Nono Dígito)

O WhatsApp envia números com 12 dígitos (`55 + DDD + 8 dígitos`), mas o banco pode ter 13 dígitos (`55 + DDD + 9 + 8 dígitos`). Sempre buscar por ambas as variantes:

```typescript
const cleanPhone = phone.replace(/\D/g, "");
const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

const phoneVariants = [formattedPhone];

if (formattedPhone.length === 13) {
    // Com nono dígito → gerar variante sem
    const withoutNinth = formattedPhone.slice(0, 4) + formattedPhone.slice(5);
    phoneVariants.push(withoutNinth);
} else if (formattedPhone.length === 12) {
    // Sem nono dígito → gerar variante com
    const withNinth = formattedPhone.slice(0, 4) + "9" + formattedPhone.slice(4);
    phoneVariants.push(withNinth);
}

// Buscar por qualquer variante
const client = await prisma.client.findFirst({
    where: { phone: { in: phoneVariants } },
});
```

---

## 7. Dockerfile e docker-compose.yml

### 7.1 Dockerfile (Next.js + Prisma)

```dockerfile
FROM node:22-alpine AS base

# Dependências necessárias para Prisma + Next.js com Alpine
RUN apk add --no-cache libc6-compat openssl

# ─── Stage 1: Instalar dependências ───
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ─── Stage 2: Build ───
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: Runner (produção) ───
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar assets e build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

> **IMPORTANTE**: O `prisma generate` é executado no stage de build porque o Prisma Client gerado é incluído no standalone output. Se esquecer isso, o container não conseguirá acessar o banco.

### 7.2 docker-compose.yml

```yaml
version: "3.8"

services:
  app:                                    # nome do serviço → hostname: {stack}_app
    image: ghcr.io/adaptare01/NOME-REPOSITORIO:latest
    env_file:
      - .env.production
    networks:
      - proxy                             # Traefik roteia o tráfego
      - adaptare                          # Acesso ao banco de dados
    deploy:
      mode: replicated
      replicas: 1
      update_config:
        parallelism: 1
        order: start-first                # Zero downtime: sobe novo antes de derrubar antigo
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

networks:
  proxy:
    external: true
  adaptare:
    external: true
```

### 7.3 Regras Importantes

1. **SEM labels Traefik** no docker-compose.yml (usar dynamic.yml)
2. **DUAS redes obrigatórias**: `proxy` (roteamento) + `adaptare` (banco)
3. **`order: start-first`** garante zero downtime no deploy
4. **`env_file: .env.production`** é criado pelo CI/CD na VPS, nunca commitado

---

## 8. CI/CD — GitHub Actions + GHCR

### 8.1 Fluxo Completo

```
Desenvolvedor faz alterações
        │
        ▼
git push origin master
        │
        ▼
GitHub Actions dispara automaticamente
        │
        ├── JOB 1: Build (~5-10 min)
        │   ├── Checkout do código
        │   ├── Login no GHCR (GitHub Container Registry)
        │   ├── Build da imagem Docker (multi-stage)
        │   └── Push para ghcr.io/adaptare01/nome:latest
        │
        └── JOB 2: Deploy (~1-2 min, após build)
            ├── Copia docker-compose.yml para VPS via SCP
            ├── SSH na VPS
            ├── Cria .env.production com secrets
            ├── Pull da nova imagem
            ├── docker stack deploy
            └── Verifica se serviço subiu
```

### 8.2 Template do Workflow

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy — NOME DO PROJETO

on:
  push:
    branches:
      - main
      - master

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: adaptare01/nome-repositorio    # ⚠️ MINÚSCULAS OBRIGATÓRIO

jobs:
  # ─── JOB 1: Build ───
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login no GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Metadados
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix=sha-

      - name: Build e Push
        uses: docker/build-push-action@v5
        with:
          context: .                # ⚠️ SEMPRE "." (raiz) — nunca subdiretório
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  # ─── JOB 2: Deploy ───
  deploy:
    name: Deploy na VPS
    runs-on: ubuntu-latest
    needs: build
    permissions:
      contents: read
      packages: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Copiar docker-compose.yml
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "docker-compose.yml"
          target: "/opt/NOME-PROJETO/"

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -e

            echo "=== Criando .env.production ==="
            mkdir -p /opt/NOME-PROJETO
            cat > /opt/NOME-PROJETO/.env.production << EOF
            DATABASE_URL=${{ secrets.DATABASE_URL }}
            N8N_API_KEY=${{ secrets.N8N_API_KEY }}
            NODE_ENV=production
            NEXT_PUBLIC_APP_URL=https://SUBDOMINIO.adaptare.ia.br
            EOF

            echo "=== Login no GHCR ==="
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io \
              -u ${{ github.actor }} --password-stdin

            echo "=== Pull da nova imagem ==="
            docker pull ghcr.io/adaptare01/NOME-REPOSITORIO:latest

            echo "=== Deploy do stack ==="
            cd /opt/NOME-PROJETO
            docker stack deploy \
              -c docker-compose.yml \
              NOME-STACK \
              --with-registry-auth \
              --prune

            echo "=== Verificando ==="
            sleep 15
            docker service ls | grep NOME-STACK

            echo "=== Deploy concluído! ==="
```

### 8.3 GitHub Secrets Necessários

| Secret | Valor | Como Obter |
|--------|-------|-----------|
| `VPS_HOST` | `31.97.19.108` | IP da VPS (igual para todos os projetos) |
| `VPS_USER` | `root` | Usuário SSH |
| `VPS_SSH_KEY` | Conteúdo da chave privada | Ver seção 8.4 |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/banco` | Formato em seção 5.3 |
| `N8N_API_KEY` | Chave aleatória (ex: `sk_n8n_abc123...`) | Gerar e usar mesma no N8N |

> ⚠️ `GITHUB_TOKEN` é **automático** — nunca criar manualmente.

### 8.4 Gerar Chave SSH para GitHub Actions

```powershell
# No PowerShell (Windows):
ssh-keygen -t ed25519 -C "github-actions-NOME-PROJETO" -f "C:\Users\m_our\.ssh\id_ed25519_NOME-PROJETO"

# Adicionar chave pública na VPS:
$pub = Get-Content "C:\Users\m_our\.ssh\id_ed25519_NOME-PROJETO.pub"
ssh root@31.97.19.108 "echo '$pub' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"

# A chave PRIVADA vai no GitHub Secret VPS_SSH_KEY:
Get-Content "C:\Users\m_our\.ssh\id_ed25519_NOME-PROJETO"
# Copiar TUDO (incluindo -----BEGIN e -----END)
```

### 8.5 Onde Acompanhar

URL: `https://github.com/Adaptare01/NOME-REPOSITORIO/actions`

---

## 9. Integração com N8N (Webhooks)

### 9.1 Arquitetura da Integração

```
WhatsApp (usuário) → N8N (processamento + IA) → Webhook API do CRM → Banco de Dados
```

### 9.2 Endpoints Webhook Disponíveis

| Método | Endpoint | Função |
|--------|---------|--------|
| `GET` | `/api/webhook/clients?phone=5549...` | Buscar cliente por telefone |
| `POST` | `/api/webhook/clients` | Criar ou encontrar cliente (upsert) |
| `POST` | `/api/webhook/leads` | Criar nova demanda/lead |

### 9.3 Headers Obrigatórios

```
x-api-key: SUA_CHAVE_N8N_API_KEY
Content-Type: application/json
```

### 9.4 Exemplos de Requisição

**Buscar cliente por telefone:**
```bash
curl -X GET "https://madeleco.adaptare.ia.br/api/webhook/clients?phone=554988345304" \
  -H "x-api-key: SUA_CHAVE"
```

**Criar lead via N8N:**
```bash
curl -X POST "https://madeleco.adaptare.ia.br/api/webhook/leads" \
  -H "x-api-key: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "João Silva",
    "clientPhone": "554988345304",
    "service": "Deck de madeira",
    "city": "Chapecó",
    "woodPreference": "Garapeira",
    "measurements": "3x5m",
    "quantity": "15m²",
    "exposure": "Externo",
    "aiContext": ["mensagem 1", "mensagem 2"]
  }'
```

### 9.5 Configuração no N8N

1. Use o nó **HTTP Request**
2. Configure:
   - **URL**: `https://SUBDOMINIO.adaptare.ia.br/api/webhook/leads`
   - **Method**: POST
   - **Headers**: `x-api-key` = `{{ $env.CRM_API_KEY }}`
   - **Body**: JSON com os campos do lead

### 9.6 Segurança

- As rotas webhook são **excluídas do middleware de autenticação** (não exigem cookie de sessão)
- A proteção é feita via **API Key** no header `x-api-key`
- A `N8N_API_KEY` deve ser a mesma no `.env.production` do CRM e nas credenciais do N8N

---

## 10. Checklist Completo — Do Zero ao Deploy

### FASE 1 — PREPARAÇÃO

```
[ ] 1.  Definir nome do projeto (ex: "madeleco", "floresteira")
[ ] 2.  Definir subdomínio (ex: madeleco.adaptare.ia.br)
[ ] 3.  Definir nome do banco (ex: madeleco_sistema)
[ ] 4.  Gerar N8N_API_KEY aleatória (usar: openssl rand -hex 32)
```

### FASE 2 — DESENVOLVIMENTO LOCAL

```
[ ] 5.  Criar repositório no GitHub (conta Adaptare01)
[ ] 6.  git clone + criar estrutura Next.js (npx create-next-app@latest)
[ ] 7.  Instalar Prisma v5.22.0: npm install prisma@5.22.0 @prisma/client@5.22.0
[ ] 8.  Configurar next.config.ts com output: "standalone"
[ ] 9.  Criar prisma/schema.prisma com models
[ ] 10. Criar src/lib/prisma.ts (singleton)
[ ] 11. Criar src/lib/auth.ts (autenticação)
[ ] 12. Criar src/middleware.ts (proteção de rotas)
[ ] 13. Criar todas as API routes (com dynamic = "force-dynamic")
[ ] 14. Criar rotas webhook com validação de API Key
[ ] 15. Implementar tratamento do nono dígito brasileiro
[ ] 16. Criar Dockerfile (multi-stage com prisma generate)
[ ] 17. Criar docker-compose.yml (SEM labels Traefik, COM redes proxy + adaptare)
[ ] 18. Criar .env.production.example
[ ] 19. Criar .gitignore (incluir .env e .env.production)
[ ] 20. Criar .github/workflows/deploy.yml
[ ] 21. Testar localmente: npm run dev (com túnel SSH para banco)
```

### FASE 3 — CONFIGURAÇÃO DO SERVIDOR

```
[ ] 22. Criar banco no PostgreSQL (via psql ou pgAdmin)
[ ] 23. Executar prisma db push (via túnel SSH) para criar tabelas
[ ] 24. Criar entrada DNS no Cloudflare (registro A, proxy ON)
[ ] 25. Verificar SSL mode no Cloudflare (Flexible para adaptare.ia.br)
[ ] 26. Adicionar router + service no /opt/traefik/config/dynamic.yml
[ ] 27. Criar diretório /opt/NOME-PROJETO/ na VPS
[ ] 28. Criar /opt/NOME-PROJETO/.env.production com variáveis reais
```

### FASE 4 — CONFIGURAÇÃO DO CI/CD

```
[ ] 29. Gerar par de chaves SSH para GitHub Actions
[ ] 30. Adicionar chave pública no /root/.ssh/authorized_keys da VPS
[ ] 31. Adicionar Secrets no GitHub: VPS_HOST, VPS_USER, VPS_SSH_KEY, DATABASE_URL, N8N_API_KEY
[ ] 32. Fazer primeiro push: git push origin master
```

### FASE 5 — VALIDAÇÃO

```
[ ] 33. Acompanhar build no GitHub Actions (https://github.com/Adaptare01/REPO/actions)
[ ] 34. Verificar serviço: ssh root@31.97.19.108 "docker service ls | grep NOME"
[ ] 35. Verificar logs: ssh root@31.97.19.108 "docker service logs STACK_app --tail 30"
[ ] 36. Testar no navegador: https://SUBDOMINIO.adaptare.ia.br
[ ] 37. Testar webhook: curl -X GET "https://SUB.adaptare.ia.br/api/webhook/clients?phone=test" -H "x-api-key: CHAVE"
[ ] 38. Configurar N8N para usar os endpoints webhook
[ ] 39. Ativar HSTS no Cloudflare (após confirmar que HTTPS funciona)
[ ] 40. Criar Page Rules no Cloudflare (bypass cache para /api/*)
```

---

## 11. Hall of Shame — Erros Conhecidos e Soluções

Cada um destes erros custou pelo menos 1-4 horas de debug. **Não os repita.**

### 🚫 #1 — Labels Traefik + dynamic.yml ao mesmo tempo
- **Sintoma**: 404 sem motivo aparente
- **Causa**: Labels Docker no `docker-compose.yml` + rota no `dynamic.yml` criam routers conflitantes
- **Solução**: Use APENAS `dynamic.yml`. Nunca adicione labels Traefik no docker-compose.
- **Tempo perdido**: ~4 horas

### 🚫 #2 — `localhost` no .env do Windows
- **Sintoma**: `Connection timed out` ao conectar ao banco
- **Causa**: Node.js no Windows resolve `localhost` para IPv6 `::1`, mas o túnel SSH é IPv4
- **Solução**: Usar `127.0.0.1` em vez de `localhost`
- **Tempo perdido**: ~2 horas

### 🚫 #3 — Senha com `#` na DATABASE_URL
- **Sintoma**: Prisma não conecta ao banco (senha cortada no `#`)
- **Causa**: `#` em URLs é interpretado como âncora/fragmento
- **Solução**: URL encode — `#` → `%23`
- **Tempo perdido**: ~1 hora

### 🚫 #4 — Prisma v7 incompatível
- **Sintoma**: `PrismaClientConstructorValidationError`
- **Causa**: Prisma v7 mudou a API de inicialização
- **Solução**: Manter Prisma v5.22.0 (`npm install prisma@5.22.0 @prisma/client@5.22.0`)
- **Tempo perdido**: ~3 horas

### 🚫 #5 — `context: ./crm-web` no GitHub Actions
- **Sintoma**: `buildx failed: path './crm-web' not found`
- **Causa**: Dockerfile está na raiz do repositório, não em subdiretório
- **Solução**: Usar `context: .` no workflow
- **Tempo perdido**: ~1 hora

### 🚫 #6 — YAML com linhas coladas no dynamic.yml
- **Sintoma**: Traefik ignora silenciosamente toda a configuração
- **Causa**: Uso de `sed` que cola linhas (ex: `servicesname-projeto:` em vez de linhas separadas)
- **Solução**: Sempre verificar o arquivo após editar: `cat /opt/traefik/config/dynamic.yml`
- **Tempo perdido**: ~2 horas

### 🚫 #7 — Re-run no commit errado no GitHub Actions
- **Sintoma**: Deploy roda mas não aplica as mudanças mais recentes
- **Causa**: "Re-run jobs" re-executa o workflow do commit da página atual, não o mais recente
- **Solução**: Fazer novo push em vez de re-run
- **Tempo perdido**: ~30 minutos

### 🚫 #8 — Rede `traefik` não é attachable
- **Sintoma**: `network proxy not manually attachable` ao usar `docker run`
- **Causa**: Redes overlay Swarm não são attachable para containers avulsos
- **Solução**: Usar `docker exec` em containers que já estão na rede, ou usar `docker service create`
- **Tempo perdido**: ~1 hora

### 🚫 #9 — Nono dígito brasileiro (WhatsApp)
- **Sintoma**: Cliente existe no banco mas webhook retorna vazio
- **Causa**: WhatsApp envia 12 dígitos (`55+DDD+8dig`), banco tem 13 dígitos (`55+DDD+9+8dig`)
- **Solução**: Sempre buscar por ambas as variantes de telefone (com e sem nono dígito)
- **Tempo perdido**: ~2 horas

### 🚫 #10 — `127.0.0.1` na DATABASE_URL dentro do Docker
- **Sintoma**: Container não conecta ao banco
- **Causa**: Dentro de um container, `127.0.0.1` aponta para o próprio container
- **Solução**: Usar hostname do serviço Swarm (`infra-adaptare_db_adaptare:5432`)
- **Tempo perdido**: ~2 horas

### 🚫 #11 — SSL mode "Full" no Cloudflare para adaptare.ia.br
- **Sintoma**: 502 Bad Gateway
- **Causa**: O Traefik não tem certificado próprio para esta zona; Cloudflare tenta HTTPS→HTTPS
- **Solução**: Usar SSL mode **Flexible** para `adaptare.ia.br`
- **Tempo perdido**: ~1 hora

### 🚫 #12 — Sem `export const dynamic = "force-dynamic"` nas API routes
- **Sintoma**: API retorna dados desatualizados/cacheados
- **Causa**: Next.js assume que rotas podem ser estáticas
- **Solução**: Adicionar `export const dynamic = "force-dynamic"` em TODAS as rotas API
- **Tempo perdido**: ~1 hora

### 🚫 #13 — Chave SSH: caminho em vez de conteúdo no GitHub Secret
- **Sintoma**: SSH falha com "invalid format"
- **Causa**: Colou `C:\Users\.ssh\id_ed25519` em vez do conteúdo da chave
- **Solução**: Copiar o **conteúdo** da chave (começa com `-----BEGIN OPENSSH PRIVATE KEY-----`)
- **Tempo perdido**: ~30 minutos

---

## 12. Comandos de Diagnóstico Rápido

### Verificar se o serviço está rodando
```bash
ssh root@31.97.19.108 "docker service ls | grep NOME-STACK"
```

### Ver logs do serviço
```bash
ssh root@31.97.19.108 "docker service logs NOME-STACK_app --tail 50"
```

### Verificar variáveis de ambiente do container
```bash
ssh root@31.97.19.108 "docker inspect \$(docker ps --filter name=NOME-STACK_app --format '{{.ID}}') | grep -A 30 Env"
```

### Testar rota internamente na VPS
```bash
ssh root@31.97.19.108 "curl -s -o /dev/null -w 'STATUS:%{http_code}' -H 'Host: SUBDOMINIO.adaptare.ia.br' http://127.0.0.1:80"
```

### Verificar containers na rede proxy
```bash
ssh root@31.97.19.108 "docker network inspect proxy --format '{{range .Containers}}{{.Name}} {{end}}'"
```

### Forçar redeploy (sem mudança de código)
```bash
ssh root@31.97.19.108 "docker service update --force NOME-STACK_app"
```

### Reiniciar Traefik
```bash
ssh root@31.97.19.108 "docker service update --force traefik_traefik"
```

### Testar conexão com banco de dentro do container
```bash
ssh root@31.97.19.108 "docker exec \$(docker ps --filter name=NOME-STACK_app --format '{{.ID}}') sh -c 'nc -zv infra-adaptare_db_adaptare 5432 && echo OK'"
```

### Ver dynamic.yml atual
```bash
ssh root@31.97.19.108 "cat /opt/traefik/config/dynamic.yml"
```

---

## 13. Referência Rápida — Tabela de Dados

### Infraestrutura

| Item | Valor |
|------|-------|
| IP da VPS | `31.97.19.108` |
| Usuário SSH | `root` |
| Traefik config | `/opt/traefik/config/dynamic.yml` |
| Diretório projetos | `/opt/NOME-PROJETO/` |
| Banco PostgreSQL (Docker interno) | `infra-adaptare_db_adaptare:5432` |
| Banco PostgreSQL (túnel SSH local) | `127.0.0.1:5433` |
| Redis | `redis_redis:6379` |
| N8N | `n8n_n8n:5678` |
| Rede proxy | `proxy` (overlay, external) |
| Rede interna | `adaptare` (overlay, external) |
| GitHub Organization | `Adaptare01` |
| GHCR base | `ghcr.io/adaptare01/` |

### Domínios e DNS

| Zona Cloudflare | Uso | SSL Mode | Traefik Entrypoint |
|-----------------|-----|----------|--------------------|
| `adaptare.ia.br` | Sistemas de clientes | Flexible | `web` (80) |
| `adaptaresoftware.com.br` | Ferramentas internas | Full (Strict) | `websecure` (443) |

### Portas

| Porta | Uso | Acessível de |
|-------|-----|-------------|
| 80 | Traefik HTTP | Internet (via Cloudflare) |
| 443 | Traefik HTTPS | Internet (via Cloudflare) |
| 3000 | Next.js (container) | Apenas rede Docker |
| 5432 | PostgreSQL (container) | Apenas rede Docker (`adaptare`) |
| 5433 | PostgreSQL (host, tunnel) | Apenas `127.0.0.1` do host |
| 5678 | N8N (container) | Apenas rede Docker |
| 6379 | Redis (container) | Apenas rede Docker |

### Versões Fixas

| Pacote | Versão | Motivo |
|--------|--------|--------|
| `prisma` | `5.22.0` | v7 quebra (PrismaClientConstructorValidationError) |
| `@prisma/client` | `5.22.0` | Deve ser mesma versão do prisma |
| `node` (Docker) | `22-alpine` | LTS com Web Crypto API |
| Next.js config | `output: "standalone"` | Obrigatório para Docker |

---

## 📝 Template de Arquivos para Novo Projeto

### .env (desenvolvimento local)
```env
DATABASE_URL="postgresql://admin_adaptare:Adaptare%2301@127.0.0.1:5433/NOME_BANCO?schema=public"
N8N_API_KEY="sk_n8n_dev_chave_local"
```

### .env.production.example (template — commitar no Git)
```env
# ============================================================
# Variáveis de Ambiente para Produção (VPS Hostinger Swarm)
# ============================================================
# INSTRUÇÃO: Copie para /opt/NOME-PROJETO/.env.production
# no servidor e preencha com dados reais.
# NUNCA commitar com dados reais!
# ============================================================

DATABASE_URL="postgresql://admin_adaptare:SENHA@infra-adaptare_db_adaptare:5432/NOME_BANCO"
NEXT_PUBLIC_APP_URL="https://SUBDOMINIO.adaptare.ia.br"
NODE_ENV="production"
N8N_API_KEY="sua-chave-n8n-producao"
```

### .gitignore
```gitignore
node_modules/
.next/
out/
dist/
build/
.env
.env.local
.env.development
.env.production
.env.*.local
*.log
npm-debug.log*
.DS_Store
Thumbs.db
.vscode/
.idea/
```

---

*Documento criado em 26/03/2026 — Baseado na experiência real do CRM Madeleco*  
*Mantido por: Adaptare Software*  
*Versão anterior: DIRETRIZ_DEPLOY_ADAPTARE.md (v1.0 — 19/03/2026)*
