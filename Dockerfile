# =========================
# Stage 1: Install Node dependencies
# =========================
FROM node:22-slim AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci


# =========================
# Stage 2: Build the application
# =========================
FROM node:22-slim AS builder

WORKDIR /app

# Copy installed Node dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy the complete project
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Generate the PostgreSQL Prisma client without connecting to a database.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npm run db:generate

# Build the Next.js application
RUN npm run build

# Confirm the Python files exist before continuing
RUN test -f /app/src/backend/cut_engine/audio.py && \
    test -f /app/src/backend/cut_engine/bridge.py && \
    echo "Python source files found"

# Confirm Next.js standalone output exists
RUN test -f /app/.next/standalone/server.js && \
    echo "Next.js standalone build found"


# =========================
# Stage 3: Small production image
# =========================
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PYTHON_BIN=python3
ENV FFMPEG_PATH=ffmpeg

# Install only runtime tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        ffmpeg \
        ca-certificates \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Copy the minimal Next.js standalone server
COPY --from=builder /app/.next/standalone ./

# Include runtime dependencies and TypeScript worker entry points.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/workers ./src/workers
COPY --from=builder /app/prisma ./prisma

# Copy static frontend assets
COPY --from=builder /app/.next/static ./.next/static

# Copy public files if the folder exists
COPY --from=builder /app/public ./public

# Copy the Python AI Cut Engine files
COPY --from=builder /app/src/backend/cut_engine ./src/backend/cut_engine

# Copy Python dependency file if it exists
COPY --from=builder /app/requirements.txt ./requirements.txt

# Install Python dependencies only when requirements.txt exists
RUN if [ -f requirements.txt ]; then \
        pip3 install \
        --no-cache-dir \
        --break-system-packages \
        -r requirements.txt; \
    fi

RUN python3 --version && \
    ffmpeg -version >/dev/null && \
    ffprobe -version >/dev/null

# Let Python find the AI Cut Engine modules
ENV PYTHONPATH=/app/src/backend/cut_engine:/app/src

# Verify the files exist in the final production image
RUN test -f /app/src/backend/cut_engine/audio.py && \
    test -f /app/src/backend/cut_engine/bridge.py && \
    echo "audio.py exists in final production image"

RUN mkdir -p /app/storage && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Override the command with `npm run worker:transcribe` for a worker service.
CMD ["node", "server.js"]
