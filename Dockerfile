# 1. Use an official lightweight Node image
FROM node:22-slim AS base

# 2. Install Python, FFmpeg, and essential build tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy package configurations and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of your codebase and install Python dependencies
COPY . .
RUN if [ -f requirements.txt ]; then pip3 install --no-cache-dir -r requirements.txt --break-system-packages; fi

# 5. Build your Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 6. Expose your port and start the server
EXPOSE 3000
CMD ["npm", "start"]
