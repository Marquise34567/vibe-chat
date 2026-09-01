FROM node:20-slim

WORKDIR /app

# Install all dependencies (tsx is in deps, but needs types from devDeps)
COPY package.json package-lock.json ./
RUN npm ci

# Copy server source + tsconfig
COPY server/ ./server/
COPY tsconfig.json ./

# Railway sets PORT at runtime; server reads process.env.PORT
EXPOSE 8090

# Start the match server
CMD ["npx", "tsx", "server/match-server.ts"]
