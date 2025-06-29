const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs').promises;
const config = require('../config');
const logger = require('../utils/logger');

// Health check básico
router.get('/', async (req, res) => {
    try {
        const health = await performHealthCheck();
        const status = health.status === 'healthy' ? 200 : 503;
        
        res.status(status).json(health);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check detalhado
router.get('/detailed', async (req, res) => {
    try {
        const health = await performDetailedHealthCheck();
        const status = health.overall.status === 'healthy' ? 200 : 503;
        
        res.status(status).json(health);
    } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Detailed health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Liveness probe (para Kubernetes)
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

// Readiness probe (para Kubernetes)
router.get('/ready', async (req, res) => {
    try {
        const isReady = await checkReadiness();
        
        if (isReady) {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Funções auxiliares
async function performHealthCheck() {
    const startTime = Date.now();
    const checks = [];
    
    // Check de sistema
    const systemCheck = await checkSystem();
    checks.push(systemCheck);
    
    // Check de memória
    const memoryCheck = checkMemory();
    checks.push(memoryCheck);
    
    // Check de disco
    const diskCheck = await checkDisk();
    checks.push(diskCheck);
    
    const responseTime = Date.now() - startTime;
    const allHealthy = checks.every(check => check.status === 'healthy');
    
    return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        service: config.appName,
        version: config.appVersion,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        checks: checks.reduce((acc, check) => {
            acc[check.name] = {
                status: check.status,
                message: check.message,
                ...(check.details && { details: check.details })
            };
            return acc;
        }, {})
    };
}

async function performDetailedHealthCheck() {
    const startTime = Date.now();
    
    const [
        systemInfo,
        memoryInfo,
        diskInfo,
        networkInfo,
        processInfo
    ] = await Promise.all([
        getSystemInfo(),
        getMemoryInfo(),
        getDiskInfo(),
        getNetworkInfo(),
        getProcessInfo()
    ]);
    
    const responseTime = Date.now() - startTime;
    
    const overall = {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
    };
    
    return {
        overall,
        system: systemInfo,
        memory: memoryInfo,
        disk: diskInfo,
        network: networkInfo,
        process: processInfo,
        service: {
            name: config.appName,
            version: config.appVersion,
            environment: config.nodeEnv,
            uptime: process.uptime(),
            pid: process.pid
        }
    };
}

async function checkSystem() {
    try {
        const loadAvg = os.loadavg();
        const cpuCount = os.cpus().length;
        const loadPercent = (loadAvg[0] / cpuCount) * 100;
        
        return {
            name: 'system',
            status: loadPercent < 80 ? 'healthy' : 'warning',
            message: `Load average: ${loadPercent.toFixed(2)}%`,
            details: {
                loadAverage: loadAvg,
                cpuCount,
                loadPercent: loadPercent.toFixed(2)
            }
        };
    } catch (error) {
        return {
            name: 'system',
            status: 'unhealthy',
            message: `System check failed: ${error.message}`
        };
    }
}

function checkMemory() {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsage = (usedMem / totalMem) * 100;
        
        return {
            name: 'memory',
            status: memoryUsage < 90 ? 'healthy' : 'warning',
            message: `Memory usage: ${memoryUsage.toFixed(2)}%`,
            details: {
                total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
                used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
                free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
                usage: `${memoryUsage.toFixed(2)}%`
            }
        };
    } catch (error) {
        return {
            name: 'memory',
            status: 'unhealthy',
            message: `Memory check failed: ${error.message}`
        };
    }
}

async function checkDisk() {
    try {
        const stats = await fs.stat('.');
        return {
            name: 'disk',
            status: 'healthy',
            message: 'Disk access ok'
        };
    } catch (error) {
        return {
            name: 'disk',
            status: 'unhealthy',
            message: `Disk check failed: ${error.message}`
        };
    }
}

async function checkReadiness() {
    // Verificar se os serviços críticos estão prontos
    try {
        // Aqui você pode adicionar verificações específicas
        // Por exemplo: conexão com banco de dados, cache, etc.
        return true;
    } catch (error) {
        logger.error('Readiness check failed:', error);
        return false;
    }
}

async function getSystemInfo() {
    return {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        cpus: os.cpus().length,
        nodeVersion: process.version
    };
}

async function getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usage: ((usedMem / totalMem) * 100).toFixed(2),
        process: process.memoryUsage()
    };
}

async function getDiskInfo() {
    try {
        const stats = await fs.stat('.');
        return {
            accessible: true,
            stats: {
                dev: stats.dev,
                ino: stats.ino,
                mode: stats.mode,
                nlink: stats.nlink,
                uid: stats.uid,
                gid: stats.gid,
                rdev: stats.rdev,
                size: stats.size,
                blksize: stats.blksize,
                blocks: stats.blocks,
                atimeMs: stats.atimeMs,
                mtimeMs: stats.mtimeMs,
                ctimeMs: stats.ctimeMs,
                birthtimeMs: stats.birthtimeMs
            }
        };
    } catch (error) {
        return {
            accessible: false,
            error: error.message
        };
    }
}

async function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networkInfo = {};
    
    for (const [name, addrs] of Object.entries(interfaces)) {
        networkInfo[name] = addrs.map(addr => ({
            address: addr.address,
            netmask: addr.netmask,
            family: addr.family,
            mac: addr.mac,
            internal: addr.internal,
            cidr: addr.cidr
        }));
    }
    
    return networkInfo;
}

async function getProcessInfo() {
    return {
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        versions: process.versions,
        uptime: process.uptime(),
        argv: process.argv,
        execPath: process.execPath,
        cwd: process.cwd(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            npm_package_version: process.env.npm_package_version
        }
    };
}

module.exports = router;
