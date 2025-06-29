#!/usr/bin/env node

/**
 * Script de Monitoramento
 * Platform DevOps - Monitoring Script
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

// Configuração
const config = {
    interval: 10000, // 10 segundos
    thresholds: {
        cpu: 80,        // 80%
        memory: 90,     // 90%
        disk: 85,       // 85%
        load: 2.0       // Load average
    },
    healthCheckUrl: 'http://localhost:3000/api/health',
    logFile: path.join(__dirname, '../logs/monitor.log'),
    alertsEnabled: true
};

// Cores para output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    const coloredMessage = `${colors[color]}${message}${colors.reset}`;
    console.log(`[${timestamp}] ${coloredMessage}`);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

// Executar comando
function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// Obter métricas do sistema
async function getSystemMetrics() {
    const metrics = {
        timestamp: new Date().toISOString(),
        cpu: getCpuMetrics(),
        memory: getMemoryMetrics(),
        load: getLoadMetrics(),
        disk: await getDiskMetrics(),
        network: getNetworkMetrics(),
        process: getProcessMetrics()
    };
    
    return metrics;
}

function getCpuMetrics() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
        for (type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return {
        count: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed,
        usage: usage,
        loadAverage: os.loadavg()
    };
}

function getMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;
    
    return {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usage: usage,
        totalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
        usedGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
        freeGB: (freeMem / 1024 / 1024 / 1024).toFixed(2)
    };
}

function getLoadMetrics() {
    const load = os.loadavg();
    const cpuCount = os.cpus().length;
    
    return {
        load1m: load[0],
        load5m: load[1],
        load15m: load[2],
        cpuCount: cpuCount,
        load1mPercent: (load[0] / cpuCount * 100).toFixed(2),
        load5mPercent: (load[1] / cpuCount * 100).toFixed(2),
        load15mPercent: (load[2] / cpuCount * 100).toFixed(2)
    };
}

async function getDiskMetrics() {
    try {
        const { stdout } = await runCommand('df -h / | tail -1');
        const parts = stdout.trim().split(/\s+/);
        
        if (parts.length >= 5) {
            const usageStr = parts[4].replace('%', '');
            const usage = parseInt(usageStr);
            
            return {
                filesystem: parts[0],
                size: parts[1],
                used: parts[2],
                available: parts[3],
                usage: usage,
                mountpoint: parts[5] || '/'
            };
        }
    } catch (error) {
        // Fallback para sistemas que não têm df
        return {
            error: 'Unable to get disk metrics',
            message: error.message
        };
    }
    
    return null;
}

function getNetworkMetrics() {
    const interfaces = os.networkInterfaces();
    const networkInfo = {};
    
    for (const [name, addrs] of Object.entries(interfaces)) {
        networkInfo[name] = addrs.filter(addr => !addr.internal);
    }
    
    return networkInfo;
}

function getProcessMetrics() {
    return {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
    };
}

// Verificar saúde da aplicação
async function checkApplicationHealth() {
    try {
        const { stdout } = await runCommand(`curl -f ${config.healthCheckUrl} -m 10`);
        const health = JSON.parse(stdout);
        
        return {
            healthy: health.status === 'healthy',
            response: health,
            responseTime: Date.now()
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            responseTime: Date.now()
        };
    }
}

// Verificar alertas
function checkAlerts(metrics) {
    const alerts = [];
    
    // CPU Alert
    if (metrics.cpu.usage > config.thresholds.cpu) {
        alerts.push({
            type: 'cpu',
            level: 'warning',
            message: `High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`,
            threshold: config.thresholds.cpu,
            current: metrics.cpu.usage
        });
    }
    
    // Memory Alert
    if (metrics.memory.usage > config.thresholds.memory) {
        alerts.push({
            type: 'memory',
            level: 'warning',
            message: `High memory usage: ${metrics.memory.usage.toFixed(2)}%`,
            threshold: config.thresholds.memory,
            current: metrics.memory.usage
        });
    }
    
    // Load Average Alert
    if (metrics.load.load1m > config.thresholds.load) {
        alerts.push({
            type: 'load',
            level: 'warning',
            message: `High load average: ${metrics.load.load1m.toFixed(2)}`,
            threshold: config.thresholds.load,
            current: metrics.load.load1m
        });
    }
    
    // Disk Alert
    if (metrics.disk && metrics.disk.usage > config.thresholds.disk) {
        alerts.push({
            type: 'disk',
            level: 'warning',
            message: `High disk usage: ${metrics.disk.usage}%`,
            threshold: config.thresholds.disk,
            current: metrics.disk.usage
        });
    }
    
    return alerts;
}

// Salvar métricas em arquivo
async function saveMetrics(metrics) {
    try {
        const logDir = path.dirname(config.logFile);
        await fs.mkdir(logDir, { recursive: true });
        
        const logEntry = {
            timestamp: metrics.timestamp,
            cpu: metrics.cpu.usage,
            memory: metrics.memory.usage,
            load: metrics.load.load1m,
            disk: metrics.disk ? metrics.disk.usage : 0,
            healthy: metrics.applicationHealth ? metrics.applicationHealth.healthy : false
        };
        
        await fs.appendFile(config.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        logError(`Failed to save metrics: ${error.message}`);
    }
}

// Mostrar métricas na tela
function displayMetrics(metrics) {
    console.clear();
    console.log('='.repeat(60));
    console.log('🔍 Platform DevOps - System Monitor');
    console.log(`📅 ${metrics.timestamp}`);
    console.log('='.repeat(60));
    
    // CPU
    const cpuColor = metrics.cpu.usage > config.thresholds.cpu ? 'red' : 'green';
    log(`💻 CPU: ${metrics.cpu.usage.toFixed(2)}% (${metrics.cpu.count} cores)`, cpuColor);
    
    // Memory
    const memColor = metrics.memory.usage > config.thresholds.memory ? 'red' : 'green';
    log(`🧠 Memory: ${metrics.memory.usage.toFixed(2)}% (${metrics.memory.usedGB}GB / ${metrics.memory.totalGB}GB)`, memColor);
    
    // Load Average
    const loadColor = metrics.load.load1m > config.thresholds.load ? 'red' : 'green';
    log(`⚖️  Load: ${metrics.load.load1m.toFixed(2)} ${metrics.load.load5m.toFixed(2)} ${metrics.load.load15m.toFixed(2)}`, loadColor);
    
    // Disk
    if (metrics.disk && !metrics.disk.error) {
        const diskColor = metrics.disk.usage > config.thresholds.disk ? 'red' : 'green';
        log(`💾 Disk: ${metrics.disk.usage}% (${metrics.disk.used} / ${metrics.disk.size})`, diskColor);
    }
    
    // Application Health
    if (metrics.applicationHealth) {
        const healthColor = metrics.applicationHealth.healthy ? 'green' : 'red';
        const healthStatus = metrics.applicationHealth.healthy ? 'Healthy' : 'Unhealthy';
        log(`🏥 Application: ${healthStatus}`, healthColor);
    }
    
    // Process Info
    log(`🔧 Process: PID ${metrics.process.pid}, Uptime ${Math.floor(metrics.process.uptime)}s`, 'cyan');
    log(`📈 Process Memory: RSS ${(metrics.process.memory.rss / 1024 / 1024).toFixed(2)}MB`, 'cyan');
    
    console.log('='.repeat(60));
    
    // Mostrar alertas
    if (metrics.alerts && metrics.alerts.length > 0) {
        console.log('🚨 ALERTS:');
        metrics.alerts.forEach(alert => {
            logWarning(`${alert.type.toUpperCase()}: ${alert.message}`);
        });
        console.log('='.repeat(60));
    }
    
    logInfo(`Next check in ${config.interval / 1000} seconds...`);
}

// Enviar alertas (webhook, email, etc.)
async function sendAlerts(alerts) {
    if (!config.alertsEnabled || alerts.length === 0) return;
    
    // Implementar envio de alertas via webhook, email, etc.
    for (const alert of alerts) {
        logWarning(`ALERT: ${alert.message}`);
        
        // Aqui você pode implementar notificações:
        // - Webhook
        // - Email
        // - Slack
        // - Discord
        // - SMS
    }
}

// Loop principal de monitoramento
async function monitorLoop() {
    logInfo('Starting Platform DevOps Monitor...');
    
    while (true) {
        try {
            // Coletar métricas
            const metrics = await getSystemMetrics();
            
            // Verificar saúde da aplicação
            metrics.applicationHealth = await checkApplicationHealth();
            
            // Verificar alertas
            metrics.alerts = checkAlerts(metrics);
            
            // Mostrar métricas
            displayMetrics(metrics);
            
            // Salvar métricas
            await saveMetrics(metrics);
            
            // Enviar alertas
            await sendAlerts(metrics.alerts);
            
        } catch (error) {
            logError(`Monitor error: ${error.message}`);
        }
        
        // Aguardar próxima iteração
        await new Promise(resolve => setTimeout(resolve, config.interval));
    }
}

// Gerar relatório
async function generateReport() {
    try {
        logInfo('Generating monitoring report...');
        
        const reportData = await fs.readFile(config.logFile, 'utf8');
        const lines = reportData.trim().split('\n').filter(line => line);
        const metrics = lines.map(line => JSON.parse(line));
        
        if (metrics.length === 0) {
            logWarning('No metrics data found for report');
            return;
        }
        
        const report = {
            period: {
                start: metrics[0].timestamp,
                end: metrics[metrics.length - 1].timestamp,
                duration: Math.floor((new Date(metrics[metrics.length - 1].timestamp) - new Date(metrics[0].timestamp)) / 1000 / 60) + ' minutes'
            },
            averages: {
                cpu: (metrics.reduce((sum, m) => sum + m.cpu, 0) / metrics.length).toFixed(2),
                memory: (metrics.reduce((sum, m) => sum + m.memory, 0) / metrics.length).toFixed(2),
                load: (metrics.reduce((sum, m) => sum + m.load, 0) / metrics.length).toFixed(2),
                disk: (metrics.reduce((sum, m) => sum + m.disk, 0) / metrics.length).toFixed(2)
            },
            maximums: {
                cpu: Math.max(...metrics.map(m => m.cpu)).toFixed(2),
                memory: Math.max(...metrics.map(m => m.memory)).toFixed(2),
                load: Math.max(...metrics.map(m => m.load)).toFixed(2),
                disk: Math.max(...metrics.map(m => m.disk))
            },
            uptime: {
                total: metrics.length,
                healthy: metrics.filter(m => m.healthy).length,
                percentage: ((metrics.filter(m => m.healthy).length / metrics.length) * 100).toFixed(2)
            }
        };
        
        console.log('\n📊 MONITORING REPORT');
        console.log('='.repeat(50));
        console.log(`Period: ${report.period.start} to ${report.period.end}`);
        console.log(`Duration: ${report.period.duration}`);
        console.log('\nAverages:');
        console.log(`  CPU: ${report.averages.cpu}%`);
        console.log(`  Memory: ${report.averages.memory}%`);
        console.log(`  Load: ${report.averages.load}`);
        console.log(`  Disk: ${report.averages.disk}%`);
        console.log('\nMaximums:');
        console.log(`  CPU: ${report.maximums.cpu}%`);
        console.log(`  Memory: ${report.maximums.memory}%`);
        console.log(`  Load: ${report.maximums.load}`);
        console.log(`  Disk: ${report.maximums.disk}%`);
        console.log('\nUptime:');
        console.log(`  Healthy checks: ${report.uptime.healthy}/${report.uptime.total}`);
        console.log(`  Availability: ${report.uptime.percentage}%`);
        console.log('='.repeat(50));
        
        // Salvar relatório
        const reportPath = path.join(__dirname, '../reports', `monitor-report-${Date.now()}.json`);
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        logSuccess(`Report saved to: ${reportPath}`);
        
    } catch (error) {
        logError(`Failed to generate report: ${error.message}`);
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--report')) {
        await generateReport();
        return;
    }
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Platform DevOps - Monitor');
        console.log('');
        console.log('Usage: node scripts/monitor.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --report    Generate monitoring report');
        console.log('  --help, -h  Show this help message');
        console.log('');
        console.log('Configuration:');
        console.log(`  Interval: ${config.interval / 1000}s`);
        console.log(`  CPU Threshold: ${config.thresholds.cpu}%`);
        console.log(`  Memory Threshold: ${config.thresholds.memory}%`);
        console.log(`  Load Threshold: ${config.thresholds.load}`);
        console.log(`  Disk Threshold: ${config.thresholds.disk}%`);
        return;
    }
    
    // Capturar sinais para graceful shutdown
    process.on('SIGINT', () => {
        logInfo('Shutting down monitor...');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        logInfo('Shutting down monitor...');
        process.exit(0);
    });
    
    // Iniciar monitoramento
    await monitorLoop();
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        logError(`Script error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { getSystemMetrics, checkApplicationHealth, generateReport };
