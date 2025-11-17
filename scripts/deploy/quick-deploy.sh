#!/bin/bash

# Quick Deploy Script for GitHub → Production
# ==========================================

echo "🚀 Deploying MPP Converter to production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Stop existing PM2 process
echo "🛑 Stopping existing application..."
pm2 stop mpp-converter 2>/dev/null || true

# Pull latest changes from GitHub
echo "📥 Pulling latest changes..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📋 Creating environment file..."
    cp .env.production .env
    echo "⚠️  IMPORTANT: Please edit .env file with your production values!"
    echo "⚠️  Run: nano .env"
    read -p "Press Enter after editing .env file..."
fi

# Create upload directories
echo "📁 Setting up directories..."
mkdir -p uploads/{incoming,processing,converted,expired,quarantine}
mkdir -p logs
chmod 755 uploads logs

# Start application with PM2
echo "🚀 Starting application..."
pm2 start api/server-minimal.js --name "mpp-converter" --max-memory-restart 500M

# Show status
pm2 status

echo "✅ Deployment completed!"
echo ""
echo "🔗 Your application should be running at: http://your-server-ip:3000"
echo ""
echo "📝 Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up Nginx reverse proxy (optional)"
echo "3. Configure SSL certificate"
echo ""
echo "🔧 Useful commands:"
echo "pm2 logs mpp-converter  - View logs"
echo "pm2 restart mpp-converter - Restart app"
echo "pm2 monit - Monitor resources"