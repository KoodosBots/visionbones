# VisionBones - Domino Leaderboard Aggregator

A Telegram Mini App for tracking domino game statistics across multiple platforms with Bible integration.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Telegram Bot Token (from @BotFather)
- Supabase account
- Hostinger VPS or any Linux VPS

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd VisionBones

# Copy environment file and configure
cp .env.example .env
# Edit .env with your values

# Start with Docker Compose
docker-compose up -d --build
```

### VPS Deployment

**Step 1: VPS Setup**
```bash
# Run VPS setup script (on your server)
chmod +x setup-vps.sh
./setup-vps.sh
```

**Step 2: Deploy Application**
```bash
# Clone repository
git clone <repository-url> /opt/visionbones
cd /opt/visionbones

# Configure environment
cp .env.example .env
# Edit .env with your production values

# Deploy with Docker
./deploy.sh

# OR Deploy with PM2 (recommended)
./deploy-pm2.sh
```

**Step 3: Manage Services**
```bash
# PM2 Management
./scripts/pm2-management.sh status
./scripts/pm2-management.sh logs
./scripts/pm2-management.sh restart

# Docker Management
docker-compose ps
docker-compose logs -f
```

This will start:
- React Mini App (served by Nginx or PM2)
- Minimal Telegram bot (launches the web app)  
- Nginx reverse proxy with SSL support
- PM2 process management (monitoring, clustering, auto-restart)
- Supabase backend (PostgreSQL + Edge Functions)

### Environment Variables
Create a `.env` file:
```bash
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBAPP_URL=https://your-domain.com

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key

# Admin
ADMIN_TELEGRAM_IDS=comma_separated_admin_ids
```

## Project Structure
```
VisionBones/
├── webapp/              # React Telegram Mini App
│   ├── Dockerfile       # Container for webapp
│   └── nginx.conf       # Nginx configuration
├── bot/                 # Minimal bot (launcher only)
│   ├── Dockerfile       # Container for bot
│   └── ecosystem.config.js # PM2 configuration
├── supabase/            # Backend functions and database
├── nginx/               # Reverse proxy configuration
├── scripts/             # Management scripts
│   └── pm2-management.sh # PM2 management utilities
├── docs/                # Project documentation
├── ecosystem.config.js  # PM2 ecosystem configuration
├── docker-compose.yml   # Docker orchestration
├── docker-compose.pm2.yml # Docker with PM2 support
├── deploy.sh           # Docker deployment script
├── deploy-pm2.sh       # PM2 deployment script
└── setup-vps.sh        # VPS setup script
```

## Features
- Manual stat tracking for domino games
- Real-time leaderboards
- Bible verses (free for all)
- Premium subscriptions ($4.99/mo)
- Admin panel for stat verification
- PM2 process management (clustering, monitoring, auto-restart)
- Docker containerization with health checks
- SSL/TLS support with Nginx reverse proxy

## Process Management Options

### PM2 (Recommended for VPS)
- **Clustering**: Run multiple instances for better performance
- **Auto-restart**: Automatic restart on crashes
- **Zero-downtime**: Reload without service interruption
- **Monitoring**: Built-in monitoring and logs
- **Memory management**: Automatic memory leak protection

### Docker
- **Containerization**: Isolated environments
- **Orchestration**: Docker Compose for multi-service management
- **Health checks**: Built-in container health monitoring
- **Scaling**: Easy horizontal scaling