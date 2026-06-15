FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN npx primsa migrate dev --name init

# Expose the port the server listens on
EXPOSE 5000

# Run with tsx (no build step needed — tsx transpiles at runtime)
CMD ["npm", "run", "dev"]
