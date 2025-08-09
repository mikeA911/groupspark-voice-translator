# Use Node.js 18 Alpine image - NOT Deno
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install production dependencies with npm (NOT deno)
RUN npm ci --only=production --no-audit --no-fund

# Copy server source code only
COPY src/ ./src/
COPY public/ ./public/ 
COPY views/ ./views/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with node directly
CMD ["node", "src/server.js"]