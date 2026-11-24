FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY services ./services
COPY storage ./storage
COPY scripts/pdf_text_agent.py ./scripts/pdf_text_agent.py

RUN mkdir -p data logs backups

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5107 \
    DATA_DIR=/app/data \
    LOG_DIR=/app/logs \
    BACKUP_DIR=/app/backups \
    DATABASE_URL=/app/data/education.db \
    PDF_AGENT_PYTHON=python3 \
    MODEL_CODE_PYTHON=python3

EXPOSE 5107

CMD ["node", "server.js"]
