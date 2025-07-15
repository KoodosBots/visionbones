#!/bin/bash

echo "🐳 VisionBones Docker Deployment Script"
echo "======================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    echo "   cp .env.example .env"
    echo "   Then edit .env with your values."
    exit 1
fi

echo "✅ Found .env file"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if Docker Compose is available
if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose is available"

# Stop existing containers if any
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment complete!"
    echo "🐳 Containers are running:"
    docker-compose ps
    echo ""
    echo "📱 Webapp should be available at: http://localhost"
    echo "🤖 Bot is running in the background"
    echo ""
    echo "📊 To view logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🔄 To update deployment:"
    echo "   git pull && ./deploy.sh"
    echo ""
    echo "🛑 To stop all services:"
    echo "   docker-compose down"
else
    echo "❌ Deployment failed. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi