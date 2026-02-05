// PM2 Ecosystem Configuration for Production
// Usage: pm2 start ecosystem.config.js

module.exports = {
    apps: [
        {
            name: 'inbox-processor',
            script: './server/inbox-processor.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                LINERA_SERVICE_URL: 'https://evonft.xyz',
                INBOX_HOST: '0.0.0.0',
                PORT: 4003
            },
            error_file: './logs/inbox-processor-error.log',
            out_file: './logs/inbox-processor-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'reminder-scheduler',
            script: './server/reminder-scheduler.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production'
            },
            error_file: './logs/reminder-scheduler-error.log',
            out_file: './logs/reminder-scheduler-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};
