FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including PM2 (handle missing package-lock.json gracefully)
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi && npm install -g pm2

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (if needed for health checks)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pm2 list | grep online || exit 1

# Start the bot with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.cjs", "--env", "production"]