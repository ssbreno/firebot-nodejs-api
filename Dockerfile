FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

RUN apt-get update && apt-get install -y fonts-liberation fonts-dejavu

FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy assets directory to both locations (for compatibility)
COPY --from=builder /app/src/assets ./src/assets
COPY --from=builder /app/src/assets ./dist/src/assets

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
