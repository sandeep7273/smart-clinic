# Multi-stage Dockerfile for API Gateway Service
FROM node:20-alpine AS base

# Stage 1: Dependencies installation
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only and clean up
RUN npm install --omit=dev --production && \
    npm cache clean --force && \
    # Remove unnecessary files from node_modules
    find node_modules -type f -name '*.md' -delete && \
    find node_modules -type f -name 'LICENSE*' -delete && \
    find node_modules -type d -name 'test' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'tests' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'docs' -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name 'examples' -exec rm -rf {} + 2>/dev/null || true

# Stage 2: Production runner
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Install dumb-init and create user in single layer
RUN apk add --no-cache dumb-init && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy production dependencies from deps stage
COPY --from=deps --chown=expressjs:nodejs /app/node_modules ./node_modules

# Copy only necessary application source
COPY --chown=expressjs:nodejs src ./src
COPY --chown=expressjs:nodejs package.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R expressjs:nodejs logs

# Use non-root user for security
USER expressjs

# Expose the application port
EXPOSE 3000

# Health check for load balancers/orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]
