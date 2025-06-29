const express = require('express');
const router = express.Router();
const os = require('os');
const config = require('../config');
const logger = require('../utils/logger');

// Armazenar métricas em memória (em produção, usar Redis ou banco)
const metricsStore = {
    requests: 0,
    errors: 0,
    responseTimeSum: 0,
    responseTimes: [],
    activeConnections: 0,
    startTime: Date.now(),
    lastMetricsReset: Date.now()
};

// Middleware para capturar métricas de requests
const metricsMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    metricsStore.requests++;
    metricsStore.activeConnections++;
    
    // Capturar fim do request
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        metricsStore.responseTimeSum += responseTime;
        metricsStore.responseTimes.push(responseTime);
        
        // Manter apenas os últimos 100 tempos de resposta
        if (metricsStore.responseTimes.length > 100) {
            metricsStore.responseTimes.shift();
        }
        
        if (res.statusCode >= 400) {
            metricsStore.errors++;
        }
        
        metricsStore.activeConnections--;
    });
    
    next();
};

// Aplicar middleware nas rotas
router.use(metricsMiddleware);

// Endpoint de métricas principais
router.get('/', async (req, res) => {
    try {
        const metrics = await getCurrentMetrics();
        res.json(metrics);
    } catch (error) {
        logger.error('Failed to get metrics:', error);
        res.status(500).json({
            error: 'Failed to retrieve metrics',
            message: error.message
        });
    }
});

// Métricas do sistema
router.get('/system', async (req, res) => {
    try {
        const systemMetrics = await getSystemMetrics();
        res.json(systemMetrics);
    } catch (error) {
        logger.error('Failed to get system metrics:', error);
        res.status(500).json({
            error: 'Failed to retrieve system metrics',
            message: error.message
        });
    }
});

// Métricas da aplicação
router.get('/application', async (req, res) => {
    try {
        const appMetrics = await getApplicationMetrics();
        res.json(appMetrics);
    } catch (error) {
        logger.error('Failed to get application metrics:', error);
        res.status(500).json({
            error: 'Failed to retrieve application metrics',
            message: error.message
        });
    }
});

// Métricas de performance
router.get('/performance', async (req, res) => {
    try {
        const perfMetrics = await getPerformanceMetrics();
        res.json(perfMetrics);
    } catch (error) {
        logger.error('Failed to get performance metrics:', error);
        res.status(500).json({
            error: 'Failed to retrieve performance metrics',
            message: error.message
        });
    }
});

// Métricas em formato Prometheus
router.get('/prometheus', async (req, res) => {
    try {
        const prometheusMetrics = await getPrometheusMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(prometheusMetrics);
    } catch (error) {
        logger.error('Failed to get Prometheus metrics:', error);
        res.status(500).send('# Error retrieving metrics\n');
    }
});

// Reset métricas
router.post('/reset', (req, res) => {
    metricsStore.requests = 0;
    metricsStore.errors = 0;
    metricsStore.responseTimeSum = 0;
    metricsStore.responseTimes = [];
    metricsStore.lastMetricsReset = Date.now();
    
    logger.info('Metrics reset');
    res.json({
        message: 'Metrics reset successfully',
        resetTime: new Date().toISOString()
    });
});

// Funções auxiliares
async function getCurrentMetrics() {
    const uptime = Date.now() - metricsStore.startTime;
    const avgResponseTime = metricsStore.requests > 0 
        ? metricsStore.responseTimeSum / metricsStore.requests 
        : 0;
    
    const errorRate = metricsStore.requests > 0 
        ? (metricsStore.errors / metricsStore.requests) * 100 
        : 0;
    
    const requestsPerSecond = metricsStore.requests / (uptime / 1000);
    
    return {
        timestamp: new Date().toISOString(),
        uptime: {
            milliseconds: uptime,
            seconds: Math.floor(uptime / 1000),
            minutes: Math.floor(uptime / 60000),
            hours: Math.floor(uptime / 3600000)
        },
        requests: {
            total: metricsStore.requests,
            errors: metricsStore.errors,
            success: metricsStore.requests - metricsStore.errors,
            errorRate: `${errorRate.toFixed(2)}%`,
            requestsPerSecond: requestsPerSecond.toFixed(2)
        },
        performance: {
            averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
            activeConnections: metricsStore.activeConnections,
            lastReset: new Date(metricsStore.lastMetricsReset).toISOString()
        },
        system: {
            memory: getMemoryMetrics(),
            cpu: getCpuMetrics(),
            load: os.loadavg()
        }
    };
}

async function getSystemMetrics() {
    return {
        timestamp: new Date().toISOString(),
        platform: {
            type: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            hostname: os.hostname()
        },
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
        },
        cpu: {
            count: os.cpus().length,
            model: os.cpus()[0]?.model || 'Unknown',
            speed: os.cpus()[0]?.speed || 0,
            loadAverage: os.loadavg()
        },
        network: os.networkInterfaces(),
        uptime: {
            system: os.uptime(),
            process: process.uptime()
        }
    };
}

async function getApplicationMetrics() {
    return {
        timestamp: new Date().toISOString(),
        application: {
            name: config.appName,
            version: config.appVersion,
            environment: config.nodeEnv,
            pid: process.pid,
            ppid: process.ppid
        },
        node: {
            version: process.version,
            versions: process.versions
        },
        memory: process.memoryUsage(),
        features: config.features,
        configuration: {
            apiPort: config.apiPort,
            websocketPort: config.websocketPort,
            monitoringEnabled: config.metricsEnabled,
            backupEnabled: config.backupEnabled
        }
    };
}

async function getPerformanceMetrics() {
    const responseTimes = metricsStore.responseTimes;
    let percentiles = {};
    
    if (responseTimes.length > 0) {
        const sorted = [...responseTimes].sort((a, b) => a - b);
        percentiles = {
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p75: sorted[Math.floor(sorted.length * 0.75)],
            p90: sorted[Math.floor(sorted.length * 0.9)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            min: Math.min(...sorted),
            max: Math.max(...sorted)
        };
    }
    
    return {
        timestamp: new Date().toISOString(),
        responseTimes: {
            percentiles,
            average: responseTimes.length > 0 
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
                : 0,
            count: responseTimes.length
        },
        throughput: {
            requestsPerSecond: metricsStore.requests / (process.uptime() || 1),
            errorsPerSecond: metricsStore.errors / (process.uptime() || 1)
        },
        connections: {
            active: metricsStore.activeConnections,
            total: metricsStore.requests
        }
    };
}

async function getPrometheusMetrics() {
    const metrics = [];
    
    // Métricas básicas
    metrics.push(`# HELP platform_devops_requests_total Total number of requests`);
    metrics.push(`# TYPE platform_devops_requests_total counter`);
    metrics.push(`platform_devops_requests_total ${metricsStore.requests}`);
    
    metrics.push(`# HELP platform_devops_errors_total Total number of errors`);
    metrics.push(`# TYPE platform_devops_errors_total counter`);
    metrics.push(`platform_devops_errors_total ${metricsStore.errors}`);
    
    metrics.push(`# HELP platform_devops_active_connections Current active connections`);
    metrics.push(`# TYPE platform_devops_active_connections gauge`);
    metrics.push(`platform_devops_active_connections ${metricsStore.activeConnections}`);
    
    // Métricas de sistema
    const memUsage = process.memoryUsage();
    metrics.push(`# HELP platform_devops_memory_usage_bytes Memory usage in bytes`);
    metrics.push(`# TYPE platform_devops_memory_usage_bytes gauge`);
    metrics.push(`platform_devops_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
    metrics.push(`platform_devops_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
    metrics.push(`platform_devops_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
    metrics.push(`platform_devops_memory_usage_bytes{type="external"} ${memUsage.external}`);
    
    metrics.push(`# HELP platform_devops_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE platform_devops_uptime_seconds gauge`);
    metrics.push(`platform_devops_uptime_seconds ${process.uptime()}`);
    
    // Métricas de CPU
    const loadAvg = os.loadavg();
    metrics.push(`# HELP platform_devops_load_average System load average`);
    metrics.push(`# TYPE platform_devops_load_average gauge`);
    metrics.push(`platform_devops_load_average{period="1m"} ${loadAvg[0]}`);
    metrics.push(`platform_devops_load_average{period="5m"} ${loadAvg[1]}`);
    metrics.push(`platform_devops_load_average{period="15m"} ${loadAvg[2]}`);
    
    return metrics.join('\n') + '\n';
}

function getMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usage: `${((usedMem / totalMem) * 100).toFixed(2)}%`,
        process: process.memoryUsage()
    };
}

function getCpuMetrics() {
    const cpus = os.cpus();
    return {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: `${cpus[0]?.speed || 0} MHz`,
        loadAverage: os.loadavg()
    };
}

module.exports = { router, metricsMiddleware, metricsStore };
