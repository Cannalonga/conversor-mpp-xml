# Dockerfile for Production Deployment
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    git \
    python3 \
    make \
    g++

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=node:node . .

# Create upload directories
RUN mkdir -p uploads/incoming uploads/processing uploads/converted uploads/expired uploads/quarantine

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "api/server-minimal.js"]