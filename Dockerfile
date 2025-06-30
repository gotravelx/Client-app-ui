# Stage 1: Build the app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Build the Next.js app
RUN npm run build

# Export static site
RUN npm run export

# ---------------------------------------

# Stage 2: Serve the app
FROM node:18-alpine

WORKDIR /app

# Install 'serve' to serve static content
RUN npm install -g serve

# Copy exported static site
COPY --from=builder /app/out ./out

# Expose port
EXPOSE 3000

# Start static server
CMD ["serve", "-s", "out", "-l", "3000"]
