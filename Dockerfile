# Railway runs one persistent container so live Playwright jobs and
# file-backed screenshots survive for the duration of each comparison.
# A Railway Volume MUST be mounted at /data before enabling public AI.
FROM node:25-bookworm

WORKDIR /app
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npm install --global pnpm@12.18.0

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Chromium and its OS libraries are required by the actual browser runner.
RUN pnpm exec playwright install --with-deps chromium

ENV PORT=3000
EXPOSE 3000
CMD ["node", "scripts/start-public-demo.mjs"]
