FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

RUN mkdir -p /app/applogs

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 8000

CMD [ "pnpm", "run", "start:dev" ]