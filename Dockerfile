FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

RUN mkdir -p /app/applogs

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# Build the NestJS app *before* starting it
RUN pnpm run build

EXPOSE 8000

# ✅ Use the compiled build in production, no watch mode
CMD [ "pnpm", "run", "start:prod" ]
