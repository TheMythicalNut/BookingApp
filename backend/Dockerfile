# Stage 1: Build TypeScript
FROM node:lts-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]