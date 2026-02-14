## CronOpus Frontend - Dockerfile
## Multi-stage build: Node + pnpm build, then Nginx to serve SPA

# ---- Stage 1: Build with pnpm ----
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack to use pnpm
RUN corepack enable

# Install dependencies using pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build


# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

