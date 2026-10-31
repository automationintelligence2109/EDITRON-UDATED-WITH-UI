# 1. Use an official lightweight Node.js image
FROM node:22-slim

# 2. Install Python, FFmpeg, and required tools
RUN apt-get update && \
    apt-get install -y \
        python3 \
        python3-pip \
        python3-venv \
        ffmpeg \
        curl && \
    rm -rf /var/lib/apt/lists/*

# 3. Set the application folder
WORKDIR /app

# 4. Copy package files first
COPY package*.json ./

# 5. Install Node.js dependencies
RUN npm install

# 6. Copy the complete project source
COPY . .

# 7. Install Python dependencies if requirements.txt exists
RUN if [ -f requirements.txt ]; then \
        pip3 install \
        --no-cache-dir \
        --break-system-packages \
        -r requirements.txt; \
    fi

# 8. Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# 9. Build the Next.js application
RUN npm run build

# 10. Copy all Python AI Cut Engine files into the generated runtime folder
RUN mkdir -p /app/.next/standalone/src/backend/cut_engine && \
    cp /app/src/backend/cut_engine/*.py \
       /app/.next/standalone/src/backend/cut_engine/

# 11. Make sure Python can find the AI Cut Engine modules
ENV PYTHONPATH=/app/.next/standalone/src/backend/cut_engine:/app/src/backend/cut_engine

# 12. Expose the application port
EXPOSE 3000

# 13. Start the application
CMD ["npm", "start"]
