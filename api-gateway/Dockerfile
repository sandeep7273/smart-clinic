# Multi-stage Dockerfile for API Gateway Service
# Stage 1: Base image with system dependencies
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory with proper permissions
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

# Stage 2: Dependencies installation
FROM base AS deps

# Copy package files
COPY --chown=node:node package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 3: Production runner
FROM base AS runner

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Copy production dependencies from deps stage
COPY --from=deps --chown=node:node /home/node/app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node . .

# Use non-root user for security
USER node

# Expose the application port
EXPOSE 3000

# Health check for load balancers/orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]
