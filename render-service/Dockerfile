FROM ghcr.io/puppeteer/puppeteer:23.6.0

USER root
WORKDIR /app

# Chromium is pre-installed by the base image under pptruser's cache.
# We run as root, so point Puppeteer at that cache dir to find it.
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
