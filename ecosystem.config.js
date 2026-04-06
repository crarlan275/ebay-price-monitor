module.exports = {
  apps: [
    {
      name: 'ebay-monitor',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      cwd: 'C:/Users/USUARIO/OneDrive/Escritorio/ebay-price-monitor',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    {
      name: 'ebay-cron',
      script: 'cron-runner.js',
      cwd: 'C:/Users/USUARIO/OneDrive/Escritorio/ebay-price-monitor',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
