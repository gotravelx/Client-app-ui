# Stage 1: Build and Export the Static App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all project files
COPY . .

# Only run next build — output: export handles static output to /out
RUN npx next build

# ---------------------------------------

# Stage 2: Serve the Static App
FROM node:18-alpine

WORKDIR /app

# Install static file server
RUN npm install -g serve

# Copy the exported static app from builder
COPY --from=builder /app/out ./out

# Expose Next.js static port
EXPOSE 3000

# Start the static server
CMD ["serve", "-s", "out", "-l", "3000"]
