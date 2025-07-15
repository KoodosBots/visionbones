module.exports = {
  apps: [
    {
      name: 'visionbones-bot',
      script: './bot/index.js',
      cwd: './bot',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_file: '.env',
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      restart_delay: 5000
    },
    {
      name: 'visionbones-webapp',
      script: 'serve',
      args: '-s ./webapp/dist -l 3000',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/webapp-error.log',
      out_file: './logs/webapp-out.log',
      log_file: './logs/webapp-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      restart_delay: 5000
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: ['your-vps-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/visionbones.git',
      path: '/opt/visionbones',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};