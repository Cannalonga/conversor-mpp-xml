# 🚀 EXCEL CONVERTER PRODUCTION DEPLOYMENT GUIDE

## 📋 Overview
This guide walks you through deploying the Excel Converter API with full enterprise-grade monitoring (Prometheus, Grafana, Sentry) to production.

## 🛠 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker-compatible environment
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 20GB+ available space
- **CPU**: 2+ cores recommended
- **Network**: Port access for 8000, 3000, 9090, 9093

### Software Requirements
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Python 3.9+ (if running without Docker)
sudo apt update && sudo apt install python3.9 python3.9-pip python3.9-venv
```

## 📁 Project Structure Setup

```bash
# Create project directory
mkdir -p /opt/excel-converter
cd /opt/excel-converter

# Clone or copy your project files here
# Ensure you have the following structure:
# /opt/excel-converter/
# ├── app/
# ├── converters/
# ├── monitoring/
# ├── docker-compose.monitoring.yml
# ├── requirements.txt
# ├── config.env
# └── Dockerfile
```

## ⚙️ Configuration

### 1. Environment Configuration
```bash
# Copy environment template
cp config.env .env

# Edit production environment variables
nano .env
```

**Critical Production Settings:**
```env
ENV=production
DEBUG=false
SECRET_KEY=your-super-secure-secret-key-min-32-chars
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
GRAFANA_PASSWORD=your-secure-grafana-password
DATABASE_URL=postgresql://prod_user:secure_password@db_host/excel_converter_db
```

### 2. Sentry Setup (Error Tracking)
1. **Create Sentry Account**: Visit [sentry.io](https://sentry.io)
2. **Create New Project**: Choose "Python" → "FastAPI"
3. **Get DSN**: Copy the DSN from project settings
4. **Update .env**: Set `SENTRY_DSN=your-dsn-here`

### 3. SSL/TLS Configuration
```bash
# Generate SSL certificates (using Let's Encrypt)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Or use existing certificates
mkdir -p /opt/excel-converter/ssl
# Copy your cert.pem and key.pem files to ./ssl/
```

## 🐳 Docker Deployment (Recommended)

### 1. Build Docker Image
```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/temp

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Build image
docker build -t excel-converter:latest .
```

### 2. Deploy with Monitoring Stack
```bash
# Deploy full monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Check all services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f excel-converter
```

## 🔧 Native Installation (Alternative)

### 1. Python Environment Setup
```bash
# Create virtual environment
python3.9 -m venv /opt/excel-converter/venv
source /opt/excel-converter/venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Install Monitoring Components

**Prometheus:**
```bash
# Download and install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvf prometheus-2.40.0.linux-amd64.tar.gz
sudo mv prometheus-2.40.0.linux-amd64 /opt/prometheus
sudo useradd --no-create-home --shell /bin/false prometheus
sudo chown -R prometheus:prometheus /opt/prometheus
```

**Grafana:**
```bash
# Add Grafana repository
sudo apt-get install -y apt-transport-https software-properties-common wget
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt-get update && sudo apt-get install grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

### 3. Service Configuration
```bash
# Create systemd service for Excel Converter
sudo cat > /etc/systemd/system/excel-converter.service << 'EOF'
[Unit]
Description=Excel Converter API
After=network.target

[Service]
Type=simple
User=excel-converter
Group=excel-converter
WorkingDirectory=/opt/excel-converter
Environment=PATH=/opt/excel-converter/venv/bin
EnvironmentFile=/opt/excel-converter/.env
ExecStart=/opt/excel-converter/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Create user and set permissions
sudo useradd --system --home /opt/excel-converter excel-converter
sudo chown -R excel-converter:excel-converter /opt/excel-converter

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable excel-converter
sudo systemctl start excel-converter
```

## 🌐 Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Configure Excel Converter upstream
sudo cat > /etc/nginx/sites-available/excel-converter << 'EOF'
upstream excel_converter {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # File Upload Limits
    client_max_body_size 100M;
    client_body_timeout 60s;

    # API Proxy
    location /api/ {
        proxy_pass http://excel_converter;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Monitoring (Grafana)
    location /monitoring/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Prometheus (optional, secure with auth)
    location /prometheus/ {
        auth_basic "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://127.0.0.1:9090/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health Check
    location /health {
        proxy_pass http://excel_converter/health;
        access_log off;
    }

    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000" always;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/excel-converter /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 📊 Monitoring Access

After deployment, access your monitoring dashboards:

- **API Documentation**: `https://your-domain.com/docs`
- **Grafana Dashboard**: `https://your-domain.com/monitoring`
- **Prometheus**: `https://your-domain.com/prometheus` (if enabled)
- **Health Check**: `https://your-domain.com/health`

## 🔍 Health Checks & Verification

### 1. API Health Check
```bash
curl -f https://your-domain.com/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

### 2. Metrics Verification
```bash
curl https://your-domain.com/monitoring/metrics
# Expected: Prometheus metrics output
```

### 3. Conversion Test
```bash
# Test Excel conversion
curl -X POST "https://your-domain.com/api/excel/convert/json" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@test.xlsx"
```

### 4. Grafana Dashboard Setup
1. **Login**: Visit `https://your-domain.com/monitoring`
2. **Credentials**: Use credentials from your `.env` file
3. **Import Dashboard**: Use the dashboard JSON from `/monitoring/grafana/dashboard-configs/`

## 🚨 Security Checklist

- [ ] Changed default passwords
- [ ] SSL/TLS certificates configured
- [ ] Firewall configured (only ports 80, 443 exposed)
- [ ] Regular security updates enabled
- [ ] Sentry DSN configured
- [ ] Database credentials secured
- [ ] File upload limits set
- [ ] API rate limiting configured
- [ ] Backup strategy implemented

## 🔄 Maintenance & Updates

### Log Rotation
```bash
# Configure logrotate
sudo cat > /etc/logrotate.d/excel-converter << 'EOF'
/opt/excel-converter/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 excel-converter excel-converter
    postrotate
        systemctl reload excel-converter
    endscript
}
EOF
```

### Backup Strategy
```bash
# Create backup script
cat > backup-excel-converter.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "excel-converter-backup-${DATE}.tar.gz" \
    /opt/excel-converter \
    --exclude='/opt/excel-converter/uploads' \
    --exclude='/opt/excel-converter/logs'
EOF

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup-excel-converter.sh" | crontab -
```

### Monitoring Alerts
Configure alerts in Grafana for:
- High error rates
- Response time degradation
- High CPU/Memory usage
- Disk space warnings
- Failed conversions

## 🆘 Troubleshooting

### Common Issues
1. **Service not starting**: Check logs with `sudo journalctl -u excel-converter -f`
2. **Memory issues**: Increase worker pool size or add more RAM
3. **Conversion failures**: Check file permissions and disk space
4. **Monitoring not working**: Verify Prometheus targets and network connectivity

### Performance Tuning
- Adjust `WORKER_POOL_SIZE` based on CPU cores
- Configure `MAX_CONCURRENT_CONVERSIONS` based on memory
- Use Redis for caching if handling high loads
- Consider horizontal scaling with load balancer

## 📞 Support
For additional support:
- Check logs: `/opt/excel-converter/logs/`
- Monitor metrics: Grafana dashboard
- Error tracking: Sentry dashboard
- Health status: `/health` endpoint