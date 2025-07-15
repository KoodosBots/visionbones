module.exports = {
  apps: [
    {
      name: 'visionbones-bot',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_file: '.env',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // Health monitoring
      health_check_url: 'http://localhost:3001/health',
      health_check_grace_period: 30000,
      
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced PM2 features
      vizion: false,
      automation: false,
      pmx: true
    }
  ]
};