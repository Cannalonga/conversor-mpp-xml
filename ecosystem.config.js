/**
 * Configuração do PM2 para Produção
 * 
 * Este arquivo define como a aplicação será executada em produção
 * usando o PM2 como gerenciador de processos.
 */

module.exports = {
  apps: [{
    // Aplicação principal
    name: 'conversor-mpp-api',
    script: './api/server.js',
    instances: 2, // Cluster mode para melhor performance
    exec_mode: 'cluster',
    
    // Configurações de ambiente
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    },
    
    // Logs
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // Restart automático
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    max_memory_restart: '1G',
    
    // Configurações avançadas
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000,
    
    // Health check
    health_check_grace_period: 3000,
    
    // Auto restart
    min_uptime: '10s',
    max_restarts: 10
  }, {
    // Worker para processamento de arquivos
    name: 'conversor-mpp-worker',
    script: './queue/worker.js',
    instances: 1,
    exec_mode: 'fork',
    
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    
    // Logs específicos do worker
    log_file: './logs/worker.log',
    out_file: './logs/worker-out.log',
    error_file: './logs/worker-error.log',
    
    // Configurações do worker
    watch: false,
    max_memory_restart: '512M',
    kill_timeout: 10000, // Worker pode precisar de mais tempo para finalizar jobs
    
    // Restart policy
    min_uptime: '30s',
    max_restarts: 5
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'your-git-repo.git',
      path: '/var/www/conversor-mpp',
      'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};