#!/bin/bash

# PM2 Management Script for VisionBones

case "$1" in
    start)
        echo "🚀 Starting VisionBones services..."
        pm2 start ecosystem.config.js --env production
        pm2 save
        ;;
    
    stop)
        echo "🛑 Stopping VisionBones services..."
        pm2 stop all
        ;;
    
    restart)
        echo "🔄 Restarting VisionBones services..."
        pm2 restart all
        ;;
    
    reload)
        echo "🔄 Reloading VisionBones services (zero-downtime)..."
        pm2 reload all
        ;;
    
    delete)
        echo "🗑️  Deleting VisionBones services..."
        pm2 delete all
        ;;
    
    status)
        echo "📊 VisionBones Services Status:"
        pm2 list
        ;;
    
    logs)
        if [ -z "$2" ]; then
            echo "📋 Showing all logs (press Ctrl+C to exit):"
            pm2 logs
        else
            echo "📋 Showing logs for $2:"
            pm2 logs "$2"
        fi
        ;;
    
    monit)
        echo "📊 Opening PM2 monitoring interface..."
        pm2 monit
        ;;
    
    web)
        echo "🌐 Starting PM2 web interface..."
        pm2 web
        ;;
    
    flush)
        echo "🧹 Flushing PM2 logs..."
        pm2 flush
        ;;
    
    reset)
        echo "🔄 Resetting PM2 counters..."
        pm2 reset all
        ;;
    
    update)
        echo "📦 Updating application and restarting..."
        git pull
        cd webapp && npm install && npm run build && cd ..
        cd bot && npm install && cd ..
        pm2 reload all
        echo "✅ Update complete!"
        ;;
    
    backup)
        echo "💾 Creating backup of PM2 configuration..."
        pm2 save --force
        cp ~/.pm2/dump.pm2 ./pm2-backup-$(date +%Y%m%d-%H%M%S).pm2
        echo "✅ Backup created!"
        ;;
    
    restore)
        if [ -z "$2" ]; then
            echo "❌ Please provide backup file: ./pm2-management.sh restore <backup-file>"
            exit 1
        fi
        echo "🔄 Restoring PM2 configuration from $2..."
        pm2 delete all
        cp "$2" ~/.pm2/dump.pm2
        pm2 resurrect
        echo "✅ Restore complete!"
        ;;
    
    health)
        echo "🏥 Health Check for VisionBones Services:"
        echo ""
        
        # Check bot health
        if pm2 list | grep -q "visionbones-bot.*online"; then
            echo "✅ Bot: Online"
        else
            echo "❌ Bot: Offline"
        fi
        
        # Check webapp health
        if pm2 list | grep -q "visionbones-webapp.*online"; then
            echo "✅ Webapp: Online"
        else
            echo "❌ Webapp: Offline"
        fi
        
        # Check if services are responding
        if curl -s http://localhost:3000 > /dev/null; then
            echo "✅ Webapp HTTP: Responding"
        else
            echo "❌ Webapp HTTP: Not responding"
        fi
        
        echo ""
        echo "📊 Memory Usage:"
        pm2 list | grep -E "(memory|visionbones)"
        ;;
    
    setup)
        echo "⚙️  Setting up PM2 for VisionBones..."
        
        # Install PM2 if not present
        if ! command -v pm2 &> /dev/null; then
            echo "📦 Installing PM2..."
            npm install -g pm2
        fi
        
        # Setup startup script
        echo "🔄 Setting up PM2 startup..."
        pm2 startup
        
        # Create logs directory
        mkdir -p logs/bot logs/webapp
        
        echo "✅ PM2 setup complete!"
        echo "ℹ️  Run the startup command shown above, then run:"
        echo "   ./scripts/pm2-management.sh start"
        ;;
    
    *)
        echo "VisionBones PM2 Management Script"
        echo "================================="
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  start     - Start all services"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  reload    - Reload all services (zero-downtime)"
        echo "  delete    - Delete all services"
        echo "  status    - Show services status"
        echo "  logs      - Show logs (optionally specify service name)"
        echo "  monit     - Open monitoring interface"
        echo "  web       - Start web interface"
        echo "  flush     - Flush all logs"
        echo "  reset     - Reset restart counters"
        echo "  update    - Git pull and restart services"
        echo "  backup    - Backup PM2 configuration"
        echo "  restore   - Restore PM2 configuration"
        echo "  health    - Check services health"
        echo "  setup     - Initial PM2 setup"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs visionbones-bot"
        echo "  $0 restore pm2-backup-20240101-120000.pm2"
        echo ""
        exit 1
        ;;
esac