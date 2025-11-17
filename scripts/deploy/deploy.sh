#!/bin/bash

# Deploy Script for Production
# ============================

set -e

echo "🚀 Starting production deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18 LTS if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "📥 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Create production directories
echo "📁 Creating production directories..."
sudo mkdir -p /var/www/mpp-converter
sudo chown -R $USER:$USER /var/www/mpp-converter
cd /var/www/mpp-converter

# Clone or update repository
if [ -d ".git" ]; then
    echo "🔄 Updating repository..."
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/Cannalonga/conversor-mpp-xml.git .
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Copy environment file
if [ ! -f ".env" ]; then
    echo "📋 Creating environment file..."
    cp .env.production .env
    echo "⚠️  Please edit .env file with your production values!"
    echo "⚠️  Run: nano .env"
fi

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p uploads/{incoming,processing,converted,expired,quarantine}
mkdir -p logs

# Set proper permissions
chmod 755 uploads
chmod 755 logs

# Install and configure Nginx
echo "🌐 Setting up Nginx..."
sudo apt-get install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/mpp-converter > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/mpp-converter /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Start application with PM2
echo "🚀 Starting application..."
pm2 stop mpp-converter 2>/dev/null || true
pm2 start api/server-minimal.js --name "mpp-converter" --max-memory-restart 500M

# Setup PM2 startup
pm2 startup
pm2 save

# Setup SSL with Let's Encrypt (optional)
read -p "Do you want to setup SSL with Let's Encrypt? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt-get install -y certbot python3-certbot-nginx
    echo "Run: sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
fi

# Setup log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/mpp-converter > /dev/null <<EOF
/var/www/mpp-converter/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reload mpp-converter
    endscript
}
EOF

echo "✅ Production deployment completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file with your production values"
echo "2. Update your domain in Nginx configuration"
echo "3. Setup SSL with certbot"
echo "4. Configure your DNS to point to this server"
echo ""
echo "📊 Useful commands:"
echo "pm2 status              - Check application status"
echo "pm2 logs mpp-converter  - View application logs"
echo "pm2 restart mpp-converter - Restart application"
echo "sudo systemctl status nginx - Check Nginx status"