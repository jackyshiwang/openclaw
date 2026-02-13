# Use Node.js 18 Alpine as requested
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (including devDependencies for build)
RUN pnpm install

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Prune dev dependencies to keep image small (optional but good practice)
# RUN pnpm prune --prod

# Set environment variable
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/server/chensi-api.js"]
