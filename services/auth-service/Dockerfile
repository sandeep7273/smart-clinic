# Multi-stage build for Auth Service
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Production image
FROM base AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production \
    PORT=4001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy dependencies from deps stage
COPY --from=deps --chown=expressjs:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=expressjs:nodejs src ./src
COPY --chown=expressjs:nodejs package*.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R expressjs:nodejs logs

# Switch to non-root user
USER expressjs

# Expose port (configurable via environment variable)
EXPOSE 4001

# Health check for EC2 load balancers and container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
