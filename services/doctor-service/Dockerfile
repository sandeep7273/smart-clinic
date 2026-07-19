# Multi-stage build for Doctor Service
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies and clean up
RUN npm ci --omit=dev --production && \
    npm cache clean --force && \
    # Remove unnecessary files from node_modules
    find node_modules -type f -name '*.md' -delete && \
    find node_modules -type f -name 'LICENSE*' -delete && \
    find node_modules -type d -name 'test' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'tests' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'docs' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'examples' -exec rm -rf {} + 2>/dev/null || true

# Production image
FROM base AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production \
    PORT=4003 \
    GRPC_PORT=50051

# Install dumb-init and create user in single layer
RUN apk add --no-cache dumb-init && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy dependencies from deps stage
COPY --from=deps --chown=expressjs:nodejs /app/node_modules ./node_modules

# Copy only necessary application files
COPY --chown=expressjs:nodejs src ./src
COPY --chown=expressjs:nodejs proto ./proto
COPY --chown=expressjs:nodejs package.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R expressjs:nodejs logs

# Switch to non-root user
USER expressjs

# Expose ports (configurable via environment variable)
EXPOSE 4003 50051

# Health check for EC2 load balancers and container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
