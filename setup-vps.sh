#!/bin/bash

echo "🖥️  VisionBones VPS Setup Script"
echo "================================"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Git (if not present)
echo "📥 Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo "✅ Git installed"
else
    echo "✅ Git already installed"
fi

# Install Nginx (for SSL termination and reverse proxy)
echo "🌐 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl enable nginx
    echo "✅ Nginx installed and enabled"
else
    echo "✅ Nginx already installed"
fi

# Install Node.js and npm
echo "🟢 Installing Node.js and npm..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js and npm installed"
else
    echo "✅ Node.js already installed"
fi

# Install PM2
echo "⚡ Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

# Install Certbot for SSL certificates
echo "🔒 Installing Certbot for SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt install snapd -y
    sudo snap install core; sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/visionbones
sudo chown $USER:$USER /opt/visionbones

# Create systemd service for auto-start
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/visionbones.service > /dev/null <<EOF
[Unit]
Description=VisionBones Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/visionbones
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable visionbones.service

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /opt/visionbones:"
echo "   cd /opt/visionbones"
echo "   git clone <your-repo-url> ."
echo ""
echo "2. Configure environment variables:"
echo "   cp .env.example .env"
echo "   nano .env"
echo ""
echo "3. Set up SSL certificate (replace your-domain.com):"
echo "   sudo certbot --nginx -d your-domain.com"
echo ""
echo "4. Start the application:"
echo "   For Docker: ./deploy.sh"
echo "   For PM2: ./deploy-pm2.sh"
echo ""
echo "5. Enable firewall:"
echo "   sudo ufw enable"
echo "   sudo ufw allow ssh"
echo "   sudo ufw allow 'Nginx Full'"
echo ""
echo "📊 Monitor logs with:"
echo "   Docker: docker-compose logs -f"
echo "   PM2: pm2 logs"
echo ""
echo "🔄 To start on boot:"
echo "   Docker: sudo systemctl start visionbones"
echo "   PM2: pm2 startup (follow instructions)"
echo ""
echo "🛠️  PM2 Management:"
echo "   ./scripts/pm2-management.sh status"
echo "   ./scripts/pm2-management.sh logs"