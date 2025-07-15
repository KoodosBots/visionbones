#!/bin/bash

echo "🚀 VisionBones PM2 Deployment Script"
echo "====================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    echo "   cp .env.example .env"
    echo "   Then edit .env with your values."
    exit 1
fi

echo "✅ Found .env file"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 is available"
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs/bot logs/webapp logs/nginx

# Install dependencies for bot
echo "🤖 Installing bot dependencies..."
cd bot
npm install
cd ..

# Build webapp
echo "📱 Building webapp..."
cd webapp
npm install
npm run build
cd ..

# Install serve globally for webapp
echo "🌐 Installing serve for webapp..."
npm install -g serve

# Stop existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 delete all || true

# Start services with PM2
echo "▶️  Starting services with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on boot
echo "🔄 Setting up PM2 startup..."
pm2 startup

# Show PM2 status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "🔍 Useful PM2 Commands:"
echo "   pm2 list                 - Show all processes"
echo "   pm2 logs                 - Show all logs"
echo "   pm2 logs visionbones-bot - Show bot logs"
echo "   pm2 logs visionbones-webapp - Show webapp logs"
echo "   pm2 restart all          - Restart all processes"
echo "   pm2 stop all             - Stop all processes"
echo "   pm2 delete all           - Delete all processes"
echo "   pm2 monit                - Monitor processes"
echo ""
echo "🌐 Services should be available at:"
echo "   📱 Webapp: http://localhost:3000"
echo "   🤖 Bot: Running in background"
echo ""
echo "📊 PM2 Web Interface (if enabled):"
echo "   http://localhost:9615"