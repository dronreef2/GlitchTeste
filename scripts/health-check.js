#!/usr/bin/env node

/**
 * Script de Health Check
 * Platform DevOps - Health Check Script
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuração
const config = {
    healthCheckUrl: 'http://localhost:3000/api/health',
    detailedHealthUrl: 'http://localhost:3000/api/health/detailed',
    timeout: 10000, // 10 segundos
    retries: 3,
    retryDelay: 2000, // 2 segundos
    outputFormat: 'console', // console, json, file
    outputFile: path.join(__dirname, '../logs/health-check.log')
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
    if (config.outputFormat === 'console') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// Executar comando HTTP
function httpRequest(url, timeout = config.timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        exec(`curl -f "${url}" -m ${timeout / 1000} -w "%{http_code},%{time_total}" -o /tmp/health-response.json -s`, 
            (error, stdout, stderr) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                if (error) {
                    reject({
                        error: error.message,
                        responseTime,
                        stdout,
                        stderr
                    });
                } else {
                    const [httpCode, curlTime] = stdout.trim().split(',');
                    
                    fs.readFile('/tmp/health-response.json', 'utf8')
                        .then(body => {
                            try {
                                const data = JSON.parse(body);
                                resolve({
                                    httpCode: parseInt(httpCode),
                                    responseTime,
                                    curlTime: parseFloat(curlTime) * 1000,
                                    data
                                });
                            } catch (parseError) {
                                resolve({
                                    httpCode: parseInt(httpCode),
                                    responseTime,
                                    curlTime: parseFloat(curlTime) * 1000,
                                    data: { raw: body }
                                });
                            }
                        })
                        .catch(() => {
                            resolve({
                                httpCode: parseInt(httpCode),
                                responseTime,
                                curlTime: parseFloat(curlTime) * 1000,
                                data: null
                            });
                        });
                }
            });
    });
}

// Health check básico
async function basicHealthCheck() {
    logInfo('Performing basic health check...');
    
    const result = {
        timestamp: new Date().toISOString(),
        endpoint: config.healthCheckUrl,
        status: 'unknown',
        responseTime: 0,
        httpCode: 0,
        healthy: false,
        data: null,
        error: null
    };
    
    try {
        const response = await httpRequest(config.healthCheckUrl);
        
        result.httpCode = response.httpCode;
        result.responseTime = response.responseTime;
        result.data = response.data;
        
        if (response.httpCode === 200 && response.data && response.data.status === 'healthy') {
            result.status = 'healthy';
            result.healthy = true;
            logSuccess(`Health check passed (${response.responseTime}ms)`);
        } else {
            result.status = 'unhealthy';
            result.healthy = false;
            logError(`Health check failed - HTTP ${response.httpCode}`);
        }
        
    } catch (error) {
        result.status = 'error';
        result.healthy = false;
        result.error = error.error;
        result.responseTime = error.responseTime;
        logError(`Health check error: ${error.error}`);
    }
    
    return result;
}

// Health check detalhado
async function detailedHealthCheck() {
    logInfo('Performing detailed health check...');
    
    const result = {
        timestamp: new Date().toISOString(),
        endpoint: config.detailedHealthUrl,
        status: 'unknown',
        responseTime: 0,
        httpCode: 0,
        healthy: false,
        data: null,
        error: null,
        checks: {}
    };
    
    try {
        const response = await httpRequest(config.detailedHealthUrl);
        
        result.httpCode = response.httpCode;
        result.responseTime = response.responseTime;
        result.data = response.data;
        
        if (response.httpCode === 200 && response.data) {
            result.status = response.data.overall?.status || 'unknown';
            result.healthy = result.status === 'healthy';
            
            // Analisar checks individuais
            if (response.data.overall) {
                result.checks = {
                    system: response.data.system ? 'healthy' : 'unhealthy',
                    memory: response.data.memory ? 'healthy' : 'unhealthy',
                    disk: response.data.disk ? 'healthy' : 'unhealthy',
                    network: response.data.network ? 'healthy' : 'unhealthy',
                    process: response.data.process ? 'healthy' : 'unhealthy'
                };
            }
            
            if (result.healthy) {
                logSuccess(`Detailed health check passed (${response.responseTime}ms)`);
            } else {
                logWarning(`Detailed health check - status: ${result.status}`);
            }
        } else {
            result.status = 'error';
            result.healthy = false;
            logError(`Detailed health check failed - HTTP ${response.httpCode}`);
        }
        
    } catch (error) {
        result.status = 'error';
        result.healthy = false;
        result.error = error.error;
        result.responseTime = error.responseTime;
        logError(`Detailed health check error: ${error.error}`);
    }
    
    return result;
}

// Verificar dependências
async function checkDependencies() {
    logInfo('Checking dependencies...');
    
    const dependencies = {
        node: { command: 'node --version', required: true },
        npm: { command: 'npm --version', required: true },
        curl: { command: 'curl --version', required: true },
        pm2: { command: 'pm2 --version', required: false },
        docker: { command: 'docker --version', required: false },
        git: { command: 'git --version', required: false }
    };
    
    const results = {};
    
    for (const [name, dep] of Object.entries(dependencies)) {
        try {
            const { stdout } = await execCommand(dep.command);
            const version = stdout.split('\n')[0].trim();
            results[name] = {
                available: true,
                version,
                required: dep.required
            };
            
            if (dep.required) {
                logSuccess(`${name}: ${version}`);
            } else {
                logInfo(`${name}: ${version}`);
            }
        } catch (error) {
            results[name] = {
                available: false,
                error: error.message,
                required: dep.required
            };
            
            if (dep.required) {
                logError(`${name}: Not available (required)`);
            } else {
                logInfo(`${name}: Not available (optional)`);
            }
        }
    }
    
    return results;
}

// Verificar conectividade de rede
async function checkNetworkConnectivity() {
    logInfo('Checking network connectivity...');
    
    const targets = [
        { name: 'localhost', url: 'http://localhost:3000' },
        { name: 'google', url: 'http://google.com' },
        { name: 'github', url: 'http://github.com' }
    ];
    
    const results = {};
    
    for (const target of targets) {
        try {
            const startTime = Date.now();
            await execCommand(`curl -f "${target.url}" -m 5 -o /dev/null -s`);
            const responseTime = Date.now() - startTime;
            
            results[target.name] = {
                reachable: true,
                responseTime,
                url: target.url
            };
            
            logSuccess(`${target.name}: ${responseTime}ms`);
        } catch (error) {
            results[target.name] = {
                reachable: false,
                error: error.message,
                url: target.url
            };
            
            logError(`${target.name}: Unreachable`);
        }
    }
    
    return results;
}

// Verificar processo da aplicação
async function checkApplicationProcess() {
    logInfo('Checking application process...');
    
    const result = {
        running: false,
        pid: null,
        memory: null,
        cpu: null,
        uptime: null
    };
    
    try {
        // Verificar se processo está rodando
        const { stdout } = await execCommand('pgrep -f "node.*server.js"');
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
            result.running = true;
            result.pid = pids[0];
            
            // Obter informações detalhadas do processo
            try {
                const { stdout: psOutput } = await execCommand(`ps -p ${result.pid} -o pid,pcpu,pmem,etime,cmd --no-headers`);
                const parts = psOutput.trim().split(/\s+/);
                
                if (parts.length >= 4) {
                    result.cpu = parseFloat(parts[1]);
                    result.memory = parseFloat(parts[2]);
                    result.uptime = parts[3];
                }
            } catch (error) {
                // Ignorar erro de ps
            }
            
            logSuccess(`Application process running (PID: ${result.pid})`);
        } else {
            result.running = false;
            logError('Application process not found');
        }
        
    } catch (error) {
        result.running = false;
        logError(`Failed to check application process: ${error.message}`);
    }
    
    return result;
}

// Health check completo
async function fullHealthCheck() {
    log('🏥 Platform DevOps - Health Check', 'cyan');
    log('='.repeat(50), 'blue');
    
    const startTime = Date.now();
    
    const healthCheck = {
        timestamp: new Date().toISOString(),
        overall: {
            healthy: false,
            status: 'unknown',
            responseTime: 0
        },
        checks: {
            basic: null,
            detailed: null,
            dependencies: null,
            network: null,
            process: null
        },
        summary: {
            passed: 0,
            failed: 0,
            warnings: 0
        }
    };
    
    try {
        // 1. Health check básico
        log('\n1. Basic Health Check', 'cyan');
        healthCheck.checks.basic = await basicHealthCheck();
        
        // 2. Health check detalhado
        log('\n2. Detailed Health Check', 'cyan');
        healthCheck.checks.detailed = await detailedHealthCheck();
        
        // 3. Verificar dependências
        log('\n3. Dependencies Check', 'cyan');
        healthCheck.checks.dependencies = await checkDependencies();
        
        // 4. Verificar conectividade
        log('\n4. Network Connectivity', 'cyan');
        healthCheck.checks.network = await checkNetworkConnectivity();
        
        // 5. Verificar processo
        log('\n5. Application Process', 'cyan');
        healthCheck.checks.process = await checkApplicationProcess();
        
        // Calcular resultado geral
        const basicHealthy = healthCheck.checks.basic?.healthy || false;
        const detailedHealthy = healthCheck.checks.detailed?.healthy || false;
        const processRunning = healthCheck.checks.process?.running || false;
        
        const requiredDeps = Object.values(healthCheck.checks.dependencies || {})
            .filter(dep => dep.required);
        const requiredDepsOk = requiredDeps.every(dep => dep.available);
        
        healthCheck.overall.healthy = basicHealthy && detailedHealthy && processRunning && requiredDepsOk;
        healthCheck.overall.status = healthCheck.overall.healthy ? 'healthy' : 'unhealthy';
        healthCheck.overall.responseTime = Date.now() - startTime;
        
        // Resumo
        healthCheck.summary.passed = [
            basicHealthy,
            detailedHealthy,
            processRunning,
            requiredDepsOk
        ].filter(Boolean).length;
        
        healthCheck.summary.failed = 4 - healthCheck.summary.passed;
        
        // Mostrar resultado final
        log('\n' + '='.repeat(50), 'blue');
        if (healthCheck.overall.healthy) {
            logSuccess(`Overall Status: HEALTHY (${healthCheck.overall.responseTime}ms)`);
        } else {
            logError(`Overall Status: UNHEALTHY (${healthCheck.overall.responseTime}ms)`);
        }
        
        log(`Checks: ${healthCheck.summary.passed} passed, ${healthCheck.summary.failed} failed`, 'cyan');
        log('='.repeat(50), 'blue');
        
    } catch (error) {
        healthCheck.overall.status = 'error';
        healthCheck.overall.healthy = false;
        logError(`Health check error: ${error.message}`);
    }
    
    // Salvar resultado
    await saveHealthCheckResult(healthCheck);
    
    return healthCheck;
}

// Salvar resultado do health check
async function saveHealthCheckResult(result) {
    try {
        const logDir = path.dirname(config.outputFile);
        await fs.mkdir(logDir, { recursive: true });
        
        if (config.outputFormat === 'json') {
            console.log(JSON.stringify(result, null, 2));
        } else if (config.outputFormat === 'file') {
            await fs.appendFile(config.outputFile, JSON.stringify(result) + '\n');
        }
        
    } catch (error) {
        logError(`Failed to save health check result: ${error.message}`);
    }
}

// Utilitário para executar comandos
function execCommand(command) {
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

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    // Parse argumentos
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Platform DevOps - Health Check');
        console.log('');
        console.log('Usage: node scripts/health-check.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --json         Output in JSON format');
        console.log('  --file         Save to file instead of console');
        console.log('  --url <url>    Custom health check URL');
        console.log('  --help, -h     Show this help message');
        console.log('');
        console.log('Exit codes:');
        console.log('  0 - Healthy');
        console.log('  1 - Unhealthy');
        console.log('  2 - Error');
        return;
    }
    
    if (args.includes('--json')) {
        config.outputFormat = 'json';
    }
    
    if (args.includes('--file')) {
        config.outputFormat = 'file';
    }
    
    const urlIndex = args.indexOf('--url');
    if (urlIndex !== -1 && args[urlIndex + 1]) {
        config.healthCheckUrl = args[urlIndex + 1];
        config.detailedHealthUrl = args[urlIndex + 1] + '/detailed';
    }
    
    try {
        const result = await fullHealthCheck();
        
        // Exit code baseado no resultado
        if (result.overall.status === 'error') {
            process.exit(2);
        } else if (result.overall.healthy) {
            process.exit(0);
        } else {
            process.exit(1);
        }
        
    } catch (error) {
        logError(`Script error: ${error.message}`);
        process.exit(2);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { fullHealthCheck, basicHealthCheck, detailedHealthCheck };
