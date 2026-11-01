# =========================
# Stage 1: Install Node dependencies
# =========================
FROM node:22-slim AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install


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

# Let Python find the AI Cut Engine modules
ENV PYTHONPATH=/app/src/backend/cut_engine:/app/src

# Verify the files exist in the final production image
RUN test -f /app/src/backend/cut_engine/audio.py && \
    test -f /app/src/backend/cut_engine/bridge.py && \
    echo "audio.py exists in final production image"

EXPOSE 3000

# Start the Next.js standalone server
CMD ["node", "server.js"]
