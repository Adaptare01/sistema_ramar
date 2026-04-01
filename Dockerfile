# ============================================================
# Dockerfile — Sistema Ramar (Vite + Express)
# Multi-stage: Build frontend → Run backend servindo estáticos
# ============================================================

# ─── Stage 1: Build do Frontend (Vite) ───
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código e buildar o frontend
COPY . .
RUN npm run build

# ─── Stage 2: Runner (Produção) ───
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Instalar apenas dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar backend
COPY server/ ./server/
COPY init_db.sql ./init_db.sql

# Copiar build do frontend (dist/)
COPY --from=builder /app/dist ./dist

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

USER appuser

EXPOSE 3001

CMD ["node", "server/index.js"]
