FROM node:22-alpine AS base
WORKDIR /app

# Install all dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# Expose the port the server listens on
EXPOSE 5000

# Run the compiled output
CMD ["npm", "start"]
