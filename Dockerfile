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
    fontconfig \
    font-noto

WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/src/assets ./src/assets
COPY --from=builder /app/src/assets ./dist/src/assets

EXPOSE 3001
CMD ["node", "dist/src/main.js"]