# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Monorepo root dosyaları
COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY backend/package.json ./backend/

# Bağımlılıkları yükle (sadece backend + shared workspace)
RUN npm ci --workspace=backend --workspace=@rezidans-fitness/shared --include-workspace-root

# Shared paketini build et
RUN npm run build -w @rezidans-fitness/shared

# Backend kaynak kodunu kopyala ve build et
COPY backend/ ./backend/
RUN npm run build -w backend

# Production bağımlılıkları (devDependencies hariç)
RUN npm ci --workspace=backend --workspace=@rezidans-fitness/shared --include-workspace-root --omit=dev

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN apk add --no-cache tini

WORKDIR /app

# Non-root kullanıcı
RUN addgroup -S wellness && adduser -S wellness -G wellness

# Build çıktılarını kopyala
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/package.json ./package.json

# Uploads dizini
RUN mkdir -p /app/backend/uploads && chown wellness:wellness /app/backend/uploads

USER wellness

ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100

# Graceful shutdown için tini kullan
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/dist/main.js"]
