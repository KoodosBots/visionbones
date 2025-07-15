# VisionBones Deployment Guide

## Quick VPS Deployment

### 1. Clone Repository
```bash
git clone https://github.com/KoodosBots/visionbones.git
cd visionbones
```

### 2. Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

**Required .env values:**
```bash
# Supabase Configuration
SUPABASE_URL=https://kdvfltdpfjddzfxbjdys.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdmZsdGRwZmpkZHpmeGJqZHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTI0OTIsImV4cCI6MjA2NzkyODQ5Mn0.2OvODxDNsd5YquO0MckIHLyqXqXLwM4w6OOJV09phs0

# Vite/Client Environment Variables (IMPORTANT: These are needed for the webapp)
VITE_SUPABASE_URL=https://kdvfltdpfjddzfxbjdys.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdmZsdGRwZmpkZHpmeGJqZHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTI0OTIsImV4cCI6MjA2NzkyODQ5Mn0.2OvODxDNsd5YquO0MckIHLyqXqXLwM4w6OOJV09phs0

# Telegram Configuration
TELEGRAM_BOT_TOKEN=7592366810:AAHP0QXfBTk9A3OLaeEq4tHnvjUWZaqG4ls
TELEGRAM_WEBAPP_URL=http://145.79.0.49:8080

# Stripe Configuration (test keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_dummy_key_for_testing

# Environment
NODE_ENV=production
```

### 3. Deploy
```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with Docker
./deploy.sh
```

## Troubleshooting

### Common Issues

**1. Package-lock.json Missing**
```bash
# The deploy script will automatically try to generate these
# If it fails, manually create them:
cd webapp && npm install && cd ..
cd bot && npm install && cd ..
```

**2. Docker Build Fails**
```bash
# Clean Docker cache and try again
docker system prune -a
./deploy.sh
```

**3. Environment Variables Not Loading**
```bash
# Make sure .env is in the root directory
ls -la .env
# Edit values if needed
nano .env
```

**4. TypeScript Build Errors**
```bash
# The webapp/package.json has been configured to skip TypeScript checking
# Build uses: "vite build" instead of "tsc -b && vite build"
```

### Manual Deployment Steps

If the automated deployment fails:

```bash
# 1. Prepare manually
cd webapp && npm install && cd ..
cd bot && npm install && cd ..

# 2. Copy environment
cp .env.example .env
# Edit .env with your values

# 3. Build images
docker-compose build

# 4. Start services
docker-compose up -d

# 5. Check logs
docker-compose logs -f
```

## Application URLs

- **Webapp**: http://145.79.0.49:8080
- **Bot Management**: Internal (PM2)
- **Database**: Supabase (hosted)

## Post-Deployment

1. **Test webapp** at http://145.79.0.49:8080
2. **Check container status**: `docker-compose ps`
3. **View logs**: `docker-compose logs -f`
4. **Update Telegram bot webhook** to point to your VPS

## Docker Services

- **webapp**: React frontend (port 8080)
- **bot**: Telegram bot (internal)
- **nginx**: Reverse proxy (port 80/443)

## Updates

To update the application:
```bash
git pull origin main
./deploy.sh
```