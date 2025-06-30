# Stage 1: Build and Export the Static App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the full source code
COPY . .

# Build and export the app
RUN npx next build && npx next export

# ---------------------------------------

# Stage 2: Serve the Static App
FROM node:18-alpine

WORKDIR /app

# Install a lightweight static file server
RUN npm install -g serve

# Copy the static export from builder
COPY --from=builder /app/out ./out

# Expose the port
EXPOSE 3000

# Serve the app
CMD ["serve", "-s", "out", "-l", "3000"]
