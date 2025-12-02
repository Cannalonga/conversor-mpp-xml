# Dockerfile for Production Deployment
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    git \
    python3 \
    make \
    g++ \
    curl

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

# Create upload directories with proper structure
RUN mkdir -p uploads/incoming uploads/processing uploads/converted uploads/expired uploads/quarantine logs

# Create public directory symlink (if needed)
RUN test -d public || mkdir -p public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (use server-enterprise.js with security patches)
CMD ["node", "api/server-enterprise.js"]