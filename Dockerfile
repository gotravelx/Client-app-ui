# Stage 1: Build the app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies with conflict resolution
RUN npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Build the Next.js static app
RUN npm run build

# ---------------------------------------

# Stage 2: Serve the static app
FROM node:18-alpine

WORKDIR /app

# Install lightweight static server
RUN npm install -g serve

# Copy the exported static site from builder
COPY --from=builder /app/out ./out

# Expose port 3000
EXPOSE 3000

# Serve the static site
CMD ["serve", "-s", "out", "-l", "3000"]
