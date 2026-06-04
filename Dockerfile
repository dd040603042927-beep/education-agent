FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5107

COPY package.json server.js README.md RELEASE_CHECKLIST.md ./
COPY public ./public
COPY scripts ./scripts

RUN mkdir -p /app/data/uploads /app/logs \
  && chown -R node:node /app

USER node

EXPOSE 5107

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5107) + '/api/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
