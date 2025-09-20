# Multi-Agent Multi-Stage Docker Build for Construction Management App

# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache g++ git make python3

# Copy package files
COPY package*.json ./

# Clear npm cache and install all dependencies
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Agent Coordinator Service
FROM node:20-alpine AS coordinator

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl redis

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy built application and services
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/services ./services
COPY --from=builder /app/types.ts ./types.ts
COPY --from=builder /app/utils ./utils

# Create shared volume directory
RUN mkdir -p /app/shared && chmod 755 /app/shared

# Expose coordinator port
EXPOSE 3000

# Health check for coordinator
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start coordinator service
CMD ["node", "-e", "require('./services/agentCoordinator.js').startCoordinatorService()"]

# Stage 3: Multi-Agent Development Environment
FROM node:20-alpine AS agent

WORKDIR /app

# Install development tools and runtime dependencies
RUN apk add --no-cache curl git docker-cli

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source code (will be overridden by volumes in docker-compose)
COPY . .

# Create shared directory
RUN mkdir -p /app/shared && chmod 755 /app/shared

# Install agent runtime
COPY scripts/agent-runtime.js ./scripts/

# Expose agent port
EXPOSE 3000

# Health check for agents
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start agent with role-based configuration
CMD ["node", "scripts/agent-runtime.js"]

# Stage 4: Production image with nginx
FROM nginx:1.25-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy PWA assets if they exist
RUN --mount=from=builder,source=/app/public/manifest.json,target=/tmp/manifest.json \
    cp /tmp/manifest.json /usr/share/nginx/html/ 2>/dev/null || true
RUN --mount=from=builder,source=/app/public/sw.js,target=/tmp/sw.js \
    cp /tmp/sw.js /usr/share/nginx/html/ 2>/dev/null || true

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage 5: Development stage (single agent mode)
FROM node:18-alpine AS development

WORKDIR /app

# Install all dependencies including dev dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]