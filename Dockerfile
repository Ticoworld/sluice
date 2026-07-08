FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8787

CMD ["npx", "tsx", "src/index.ts", "serve", "--host", "0.0.0.0", "--port", "8787"]
