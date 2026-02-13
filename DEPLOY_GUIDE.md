# Deployment Guide for Moltbot (Chensi)

This guide describes how to deploy the Moltbot backend and database to an Aliyun ECS instance using Docker.

## Prerequisites

1.  **Aliyun ECS Instance**: A server running Linux (e.g., Ubuntu 22.04 or Alibaba Cloud Linux).
2.  **Docker & Docker Compose**: Installed on the server.
3.  **Git**: To clone the repository (or you can upload files manually).

## Deployment Steps

### 1. Prepare the Server

Connect to your ECS instance:
```bash
ssh root@your-server-ip
```

Install Docker (if not installed):
```bash
# For Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 2. Get the Code

Clone the repository or upload the project files to a directory (e.g., `/opt/moltbot`).

```bash
mkdir -p /opt/moltbot
cd /opt/moltbot
# Clone your repo or upload files
```

Ensure the following files are present:
- `Dockerfile`
- `docker-compose.prod.yml`
- `package.json`
- `pnpm-lock.yaml`
- `src/`
- `nginx.conf` (if using Nginx)

### 3. Configure Environment Variables

Create a `.env` file for production secrets. **Do not commit this file to Git.**

```bash
nano .env
```

Add the following content (replace with your actual keys):

```env
NODE_ENV=production
DB_PASS=your_secure_db_password
OPENAI_API_KEY=your_openai_api_key
# Add other keys as needed
```

### 4. Start the Services

Run the application using the production Docker Compose file:

```bash
# Build and start containers in the background
docker compose -f docker-compose.prod.yml up -d --build
```

### 5. Verify Deployment

Check if containers are running:
```bash
docker compose -f docker-compose.prod.yml ps
```

View logs if needed:
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

### 6. Configure Nginx (Reverse Proxy)

If you are running Nginx on the host machine to handle SSL (recommended for WeChat):

1.  Install Nginx: `apt install nginx`
2.  Copy the provided config: `cp nginx.conf /etc/nginx/sites-available/moltbot`
3.  Link it: `ln -s /etc/nginx/sites-available/moltbot /etc/nginx/sites-enabled/`
4.  Test config: `nginx -t`
5.  Reload Nginx: `systemctl reload nginx`

*Note: Ensure your Security Group rules on Aliyun allow traffic on ports 80, 443, and 3000 (if accessing directly).*

## Maintenance

- **Restart App**: `docker compose -f docker-compose.prod.yml restart app`
- **Update Code**:
    1.  `git pull`
    2.  `docker compose -f docker-compose.prod.yml up -d --build`

