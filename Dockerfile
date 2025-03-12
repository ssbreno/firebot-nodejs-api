FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}


RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    fontconfig


RUN addgroup -S appuser && adduser -S -g appuser appuser \
    && mkdir -p /home/appuser/.cache \
    && chown -R appuser:appuser /home/appuser


ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/src/assets ./src/assets
COPY --from=builder /app/src/assets ./dist/src/assets

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3001
CMD ["node", "dist/src/main.js"]