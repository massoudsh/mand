# syntax=docker/dockerfile:1
FROM node:20.20.2-bookworm-slim

# The SQLite bridge (db/store.py) is invoked as `python3`; only the standard
# library is used, so Debian's Python 3.11 is sufficient.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend ./backend
COPY db ./db
COPY frontend ./frontend

RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production \
    PORT=3000 \
    MAND_DB_PATH=/data/mand.sqlite \
    ENABLE_LIVE_SENDS=false

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "backend/server.js"]
