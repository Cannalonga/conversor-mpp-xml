#!/bin/bash
# ============================================================================
# CANNACONVERT - SCRIPT DE INSTALAÇÃO PARA UBUNTU 24.04 LTS
# ============================================================================
# Este script prepara um servidor Ubuntu 24.04 LTS limpo para produção.
# Execute como root ou com sudo.
#
# Uso:
#   chmod +x install_production_ubuntu24.sh
#   sudo ./install_production_ubuntu24.sh
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="cannaconvert"
APP_DIR="/opt/cannaconvert"
DOMAIN="${DOMAIN:-cannaconvert.com.br}"
EMAIL="${EMAIL:-admin@cannaconvert.com.br}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script precisa ser executado como root (use sudo)"
    fi
}

check_ubuntu_version() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Não foi possível detectar o sistema operacional"
    fi
    
    source /etc/os-release
    
    if [[ "$ID" != "ubuntu" ]]; then
        log_error "Este script é para Ubuntu. Detectado: $ID"
    fi
    
    if [[ "$VERSION_ID" != "24.04" ]]; then
        log_warning "Este script foi testado para Ubuntu 24.04. Detectado: $VERSION_ID"
        read -p "Deseja continuar mesmo assim? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Ubuntu $VERSION_ID detectado"
}

# ============================================================================
# INSTALLATION STEPS
# ============================================================================

update_system() {
    log_info "Atualizando sistema..."
    apt update
    apt upgrade -y
    apt autoremove -y
    log_success "Sistema atualizado"
}

install_dependencies() {
    log_info "Instalando dependências..."
    apt install -y \
        curl \
        wget \
        git \
        htop \
        vim \
        unzip \
        jq \
        software-properties-common \
        ca-certificates \
        gnupg \
        lsb-release \
        fail2ban \
        ufw \
        nginx \
        certbot \
        python3-certbot-nginx
    log_success "Dependências instaladas"
}

install_docker() {
    log_info "Instalando Docker..."
    
    # Remove old versions
    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
        apt remove -y $pkg 2>/dev/null || true
    done
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add the repository to Apt sources
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Configure Docker daemon
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF
    
    # Start and enable Docker
    systemctl restart docker
    systemctl enable docker
    
    log_success "Docker instalado: $(docker --version)"
}

create_app_user() {
    log_info "Criando usuário $APP_USER..."
    
    if id "$APP_USER" &>/dev/null; then
        log_warning "Usuário $APP_USER já existe"
    else
        adduser "$APP_USER" --disabled-password --gecos "" || true
        echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$APP_USER
        chmod 440 /etc/sudoers.d/$APP_USER
        log_success "Usuário $APP_USER criado"
    fi
    
    # Add user to docker group
    usermod -aG docker "$APP_USER"
    
    # Setup SSH keys if root has them
    if [[ -f /root/.ssh/authorized_keys ]]; then
        mkdir -p /home/$APP_USER/.ssh
        cp /root/.ssh/authorized_keys /home/$APP_USER/.ssh/
        chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
        chmod 700 /home/$APP_USER/.ssh
        chmod 600 /home/$APP_USER/.ssh/authorized_keys
        log_success "Chaves SSH copiadas para $APP_USER"
    fi
}

setup_firewall() {
    log_info "Configurando firewall (UFW)..."
    
    # Reset and configure
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configurado"
    ufw status verbose
}

setup_fail2ban() {
    log_info "Configurando Fail2Ban..."
    
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log_success "Fail2Ban configurado"
}

setup_app_directories() {
    log_info "Criando estrutura de diretórios..."
    
    mkdir -p $APP_DIR/{app,backups,logs,uploads,temp}
    mkdir -p $APP_DIR/backups/postgres
    mkdir -p $APP_DIR/logs/{frontend,backend}
    mkdir -p /var/www/certbot
    mkdir -p /var/www/cannaconvert
    
    chown -R $APP_USER:$APP_USER $APP_DIR
    chmod -R 755 $APP_DIR
    
    log_success "Diretórios criados em $APP_DIR"
}

setup_nginx_temp() {
    log_info "Configurando NGINX temporário (para Certbot)..."
    
    # Create temporary config for SSL certificate
    cat > /etc/nginx/sites-available/cannaconvert-temp.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    
    location / {
        return 200 'CannaConvert - Server Ready for SSL Setup';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable temp config
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/cannaconvert-temp.conf /etc/nginx/sites-enabled/cannaconvert.conf
    
    # Test and reload
    nginx -t
    systemctl reload nginx
    systemctl enable nginx
    
    log_success "NGINX temporário configurado"
}

setup_ssl() {
    log_info "Configurando SSL com Let's Encrypt..."
    
    # Check if domain is pointing to this server
    SERVER_IP=$(curl -s ifconfig.me)
    DOMAIN_IP=$(dig +short $DOMAIN | head -1)
    
    if [[ "$SERVER_IP" != "$DOMAIN_IP" ]]; then
        log_warning "O domínio $DOMAIN não está apontando para este servidor ($SERVER_IP)"
        log_warning "DNS atual: $DOMAIN_IP"
        log_warning "Configure o DNS e execute manualmente:"
        log_warning "  certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email"
        return
    fi
    
    # Request certificate
    certbot certonly --webroot \
        -w /var/www/certbot \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive
    
    log_success "Certificado SSL obtido"
}

setup_nginx_final() {
    log_info "Configurando NGINX final..."
    
    # Check if SSL cert exists
    if [[ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
        log_warning "Certificado SSL não encontrado. NGINX configurado apenas para HTTP."
        return
    fi
    
    # Copy production config
    if [[ -f $APP_DIR/app/server/nginx/cannaconvert.conf ]]; then
        cp $APP_DIR/app/server/nginx/cannaconvert.conf /etc/nginx/sites-available/cannaconvert.conf
        
        # Replace domain placeholder
        sed -i "s/cannaconvert.com.br/$DOMAIN/g" /etc/nginx/sites-available/cannaconvert.conf
        
        # Enable config
        ln -sf /etc/nginx/sites-available/cannaconvert.conf /etc/nginx/sites-enabled/cannaconvert.conf
        
        # Test and reload
        nginx -t && systemctl reload nginx
        
        log_success "NGINX configurado com SSL"
    else
        log_warning "Arquivo de configuração NGINX não encontrado. Configure manualmente."
    fi
}

setup_timezone() {
    log_info "Configurando timezone..."
    timedatectl set-timezone America/Sao_Paulo
    log_success "Timezone: $(timedatectl show --property=Timezone --value)"
}

setup_hostname() {
    log_info "Configurando hostname..."
    hostnamectl set-hostname cannaconvert-prod
    echo "127.0.0.1 cannaconvert-prod" >> /etc/hosts
    log_success "Hostname configurado"
}

print_summary() {
    echo ""
    echo "============================================================================"
    echo -e "${GREEN}INSTALAÇÃO CONCLUÍDA!${NC}"
    echo "============================================================================"
    echo ""
    echo "Próximos passos:"
    echo ""
    echo "1. Clone o repositório:"
    echo "   su - $APP_USER"
    echo "   cd $APP_DIR"
    echo "   git clone https://github.com/Cannalonga/conversor-mpp-xml.git app"
    echo ""
    echo "2. Configure as variáveis de ambiente:"
    echo "   cd $APP_DIR/app"
    echo "   cp deploy/production/.env.production.template .env"
    echo "   nano .env"
    echo ""
    echo "3. Inicie a aplicação:"
    echo "   docker compose -f docker-compose.production.yml up -d"
    echo ""
    echo "4. Verifique os logs:"
    echo "   docker compose -f docker-compose.production.yml logs -f"
    echo ""
    echo "============================================================================"
    echo "Informações do servidor:"
    echo "  - IP: $(curl -s ifconfig.me)"
    echo "  - Domínio: $DOMAIN"
    echo "  - Usuário: $APP_USER"
    echo "  - Diretório: $APP_DIR"
    echo "============================================================================"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    echo ""
    echo "============================================================================"
    echo "CANNACONVERT - Instalação para Ubuntu 24.04 LTS"
    echo "============================================================================"
    echo ""
    
    check_root
    check_ubuntu_version
    
    echo ""
    read -p "Deseja continuar com a instalação? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
    
    # Run installation steps
    update_system
    install_dependencies
    install_docker
    create_app_user
    setup_firewall
    setup_fail2ban
    setup_app_directories
    setup_timezone
    setup_hostname
    setup_nginx_temp
    
    # SSL setup (optional - may fail if DNS not configured)
    echo ""
    read -p "Deseja configurar SSL agora? (requer DNS configurado) (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
        setup_nginx_final
    fi
    
    print_summary
}

# Run main function
main "$@"
