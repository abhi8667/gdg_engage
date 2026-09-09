# ==============================================================================
# Stage 1: Build the Vite React frontend
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Minimal Production Image
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=10000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy static build output from builder
COPY --from=builder /app/dist ./dist

# Copy backend server script, assets, and seed data
COPY server.js ./
COPY public/ ./public/
COPY pose/ ./pose/
COPY data/ ./data/

# Expose Render standard container port
EXPOSE 10000

# Healthcheck to verify the server and /healthz endpoint are responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 10000) + '/healthz').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the unified Express + WebSocket + Static server
CMD ["node", "server.js"]
