FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the Next.js app
RUN npm run build

EXPOSE 3000

# Start the production server
CMD ["npm", "run", "dev"]
