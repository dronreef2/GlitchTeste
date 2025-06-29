const config = {
    // Configuração da aplicação
    appName: process.env.APP_NAME || 'platform-devops',
    appVersion: process.env.APP_VERSION || '1.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    appEnv: process.env.APP_ENV || 'development',

    // Configuração de portas
    apiPort: parseInt(process.env.API_PORT) || 3000,
    websocketPort: parseInt(process.env.WEBSOCKET_PORT) || 3001,
    monitoringPort: parseInt(process.env.MONITORING_PORT) || 9090,

    // Configuração de segurança
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // Configuração de banco de dados
    databaseUrl: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/platform_devops',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // Configuração de logs
    logLevel: process.env.LOG_LEVEL || 'info',
    logFormat: process.env.LOG_FORMAT || 'json',

    // Configuração de monitoramento
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT) || 9090,

    // Configuração de deploy
    deployEnv: process.env.DEPLOY_ENV || 'development',
    deployBranch: process.env.DEPLOY_BRANCH || 'main',
    autoDeploy: process.env.AUTO_DEPLOY === 'true',
    rollbackEnabled: process.env.ROLLBACK_ENABLED !== 'false',

    // Configuração de backup
    backupEnabled: process.env.BACKUP_ENABLED === 'true',
    backupSchedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    backupS3Bucket: process.env.BACKUP_S3_BUCKET || 'platform-devops-backups',

    // Configuração de notificações
    webhookUrl: process.env.WEBHOOK_URL || '',
    notificationEmail: process.env.NOTIFICATION_EMAIL || 'admin@platform-devops.com',
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    },

    // Configuração de features
    features: {
        webssh: process.env.FEATURE_WEBSSH === 'true',
        webftp: process.env.FEATURE_WEBFTP === 'true',
        apiDashboard: process.env.FEATURE_API_DASHBOARD === 'true',
        autoScaling: process.env.FEATURE_AUTO_SCALING === 'true'
    },

    // Configuração de CloudFlare
    cloudflare: {
        apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
        zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
        domain: process.env.CLOUDFLARE_DOMAIN || ''
    },

    // Configuração Docker
    docker: {
        registry: process.env.DOCKER_REGISTRY || '',
        imageTag: process.env.DOCKER_IMAGE_TAG || 'latest'
    },

    // Configuração Kubernetes
    kubernetes: {
        configPath: process.env.KUBE_CONFIG_PATH || '~/.kube/config',
        namespace: process.env.KUBE_NAMESPACE || 'default'
    },

    // Rate limiting
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100 // máximo 100 requests por janela
    },

    // Cache
    cache: {
        ttl: 300, // 5 minutos
        checkperiod: 320
    }
};

module.exports = config;
