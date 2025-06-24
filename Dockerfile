# Stage 1: Build the app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build the Next.js app
RUN npm run build

# ---------------------------------------

# Stage 2: Run the app
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Expose port (default Next.js port)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
