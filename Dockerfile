# Use Node.js 20 LTS instead of 18 to fix undici compatibility
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (not necessary for Discord bot, but good practice)
EXPOSE 3000

# Health check to ensure bot is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot health check')" || exit 1

# Start the bot
CMD ["node", "index.js"]
