#!/usr/bin/env node

/**
 * Script de Deploy Automatizado
 * Platform DevOps - Deploy Script
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Configuração
const config = {
    environments: ['development', 'staging', 'production'],
    defaultEnvironment: 'development',
    defaultBranch: 'main',
    healthCheckTimeout: 30000
};

// Cores para output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`[${step}] ${message}`, 'cyan');
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

// Obter argumentos da linha de comando
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        environment: config.defaultEnvironment,
        branch: config.defaultBranch,
        skipTests: false,
        skipBackup: false,
        force: false,
        rollback: false,
        version: null
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--env':
            case '--environment':
                options.environment = args[++i];
                break;
            case '--branch':
                options.branch = args[++i];
                break;
            case '--version':
                options.version = args[++i];
                break;
            case '--skip-tests':
                options.skipTests = true;
                break;
            case '--skip-backup':
                options.skipBackup = true;
                break;
            case '--force':
                options.force = true;
                break;
            case '--rollback':
                options.rollback = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
            default:
                if (config.environments.includes(args[i])) {
                    options.environment = args[i];
                }
                break;
        }
    }
    
    return options;
}

function showHelp() {
    log('Platform DevOps - Deploy Script', 'cyan');
    log('');
    log('Usage: node scripts/deploy.js [options] [environment]', 'yellow');
    log('');
    log('Environments:', 'green');
    config.environments.forEach(env => {
        log(`  ${env}${env === config.defaultEnvironment ? ' (default)' : ''}`);
    });
    log('');
    log('Options:', 'green');
    log('  --env, --environment <env>  Target environment');
    log('  --branch <branch>           Git branch to deploy (default: main)');
    log('  --version <version>         Version to deploy');
    log('  --skip-tests               Skip running tests');
    log('  --skip-backup              Skip creating backup');
    log('  --force                    Force deploy without confirmation');
    log('  --rollback                 Perform rollback instead of deploy');
    log('  --help, -h                 Show this help message');
    log('');
    log('Examples:', 'yellow');
    log('  node scripts/deploy.js development');
    log('  node scripts/deploy.js --env production --branch release');
    log('  node scripts/deploy.js --rollback --env staging');
}

// Executar comando
function runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        const child = exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
        
        if (options.verbose) {
            child.stdout.on('data', data => process.stdout.write(data));
            child.stderr.on('data', data => process.stderr.write(data));
        }
    });
}

// Validar ambiente
function validateEnvironment(environment) {
    if (!config.environments.includes(environment)) {
        logError(`Invalid environment: ${environment}`);
        log(`Available environments: ${config.environments.join(', ')}`, 'yellow');
        return false;
    }
    return true;
}

// Confirmar deploy
async function confirmDeploy(options) {
    if (options.force) return true;
    
    log('');
    log('Deploy Configuration:', 'cyan');
    log(`  Environment: ${options.environment}`);
    log(`  Branch: ${options.branch}`);
    if (options.version) log(`  Version: ${options.version}`);
    log(`  Skip Tests: ${options.skipTests}`);
    log(`  Skip Backup: ${options.skipBackup}`);
    log('');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question('Continue with deploy? (y/N): ', answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// Verificar status do repositório
async function checkRepoStatus() {
    logStep('REPO', 'Checking repository status...');
    
    try {
        // Verificar se há mudanças não commitadas
        const { stdout: status } = await runCommand('git status --porcelain');
        if (status.trim()) {
            logWarning('Repository has uncommitted changes:');
            console.log(status);
        }
        
        // Verificar branch atual
        const { stdout: branch } = await runCommand('git rev-parse --abbrev-ref HEAD');
        logSuccess(`Current branch: ${branch.trim()}`);
        
        return true;
    } catch (error) {
        logError('Failed to check repository status');
        console.error(error.stderr);
        return false;
    }
}

// Atualizar código
async function updateCode(branch) {
    logStep('UPDATE', `Updating code from branch ${branch}...`);
    
    try {
        // Fetch latest changes
        await runCommand('git fetch origin');
        
        // Checkout to target branch
        await runCommand(`git checkout ${branch}`);
        
        // Pull latest changes
        await runCommand(`git pull origin ${branch}`);
        
        logSuccess('Code updated successfully');
        return true;
    } catch (error) {
        logError('Failed to update code');
        console.error(error.stderr);
        return false;
    }
}

// Instalar dependências
async function installDependencies() {
    logStep('DEPS', 'Installing dependencies...');
    
    try {
        await runCommand('npm ci', { verbose: true });
        logSuccess('Dependencies installed successfully');
        return true;
    } catch (error) {
        logError('Failed to install dependencies');
        console.error(error.stderr);
        return false;
    }
}

// Executar testes
async function runTests() {
    logStep('TEST', 'Running tests...');
    
    try {
        await runCommand('npm test', { verbose: true });
        logSuccess('All tests passed');
        return true;
    } catch (error) {
        logError('Tests failed');
        console.error(error.stderr);
        return false;
    }
}

// Criar backup
async function createBackup(environment) {
    logStep('BACKUP', `Creating backup for ${environment}...`);
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `pre-deploy-${environment}-${timestamp}`;
        
        // Criar backup da configuração atual
        const configDir = path.join(__dirname, '../config');
        const backupDir = path.join(__dirname, '../backups', backupName);
        
        await fs.mkdir(backupDir, { recursive: true });
        await runCommand(`cp -r ${configDir} ${backupDir}/config`);
        
        logSuccess(`Backup created: ${backupName}`);
        return backupName;
    } catch (error) {
        logError('Failed to create backup');
        console.error(error);
        return null;
    }
}

// Build da aplicação
async function buildApplication() {
    logStep('BUILD', 'Building application...');
    
    try {
        await runCommand('npm run build', { verbose: true });
        logSuccess('Application built successfully');
        return true;
    } catch (error) {
        logWarning('Build command failed or not configured');
        return true; // Continue even if build fails
    }
}

// Verificar saúde da aplicação
async function healthCheck(environment) {
    logStep('HEALTH', 'Performing health check...');
    
    const ports = {
        development: 3000,
        staging: 3001,
        production: 3002
    };
    
    const port = ports[environment] || 3000;
    
    try {
        // Aguardar um momento para a aplicação inicializar
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const { stdout } = await runCommand(`curl -f http://localhost:${port}/api/health`);
        const health = JSON.parse(stdout);
        
        if (health.status === 'healthy') {
            logSuccess('Health check passed');
            return true;
        } else {
            logError('Health check failed - application unhealthy');
            return false;
        }
    } catch (error) {
        logError('Health check failed - application not responding');
        return false;
    }
}

// Deploy principal
async function deploy(options) {
    log('');
    log('🚀 Starting Platform DevOps Deploy', 'magenta');
    log('='.repeat(50), 'blue');
    
    // Validar ambiente
    if (!validateEnvironment(options.environment)) {
        process.exit(1);
    }
    
    // Confirmar deploy
    if (!await confirmDeploy(options)) {
        log('Deploy cancelled by user', 'yellow');
        process.exit(0);
    }
    
    const startTime = Date.now();
    let backupName = null;
    
    try {
        // 1. Verificar status do repositório
        if (!await checkRepoStatus()) {
            throw new Error('Repository check failed');
        }
        
        // 2. Criar backup (se não for para pular)
        if (!options.skipBackup) {
            backupName = await createBackup(options.environment);
            if (!backupName) {
                throw new Error('Backup creation failed');
            }
        }
        
        // 3. Atualizar código
        if (!await updateCode(options.branch)) {
            throw new Error('Code update failed');
        }
        
        // 4. Instalar dependências
        if (!await installDependencies()) {
            throw new Error('Dependencies installation failed');
        }
        
        // 5. Executar testes (se não for para pular)
        if (!options.skipTests) {
            if (!await runTests()) {
                throw new Error('Tests failed');
            }
        }
        
        // 6. Build da aplicação
        if (!await buildApplication()) {
            logWarning('Build step had issues but continuing...');
        }
        
        // 7. Restart da aplicação (usando PM2 ou similar)
        logStep('RESTART', 'Restarting application...');
        try {
            await runCommand('pm2 restart platform-devops');
            logSuccess('Application restarted');
        } catch (error) {
            logWarning('PM2 restart failed, application may need manual restart');
        }
        
        // 8. Health check
        if (!await healthCheck(options.environment)) {
            throw new Error('Health check failed');
        }
        
        // Deploy concluído com sucesso
        const duration = Math.round((Date.now() - startTime) / 1000);
        log('');
        log('='.repeat(50), 'green');
        logSuccess(`Deploy completed successfully in ${duration}s`);
        log(`Environment: ${options.environment}`, 'green');
        log(`Branch: ${options.branch}`, 'green');
        if (backupName) log(`Backup: ${backupName}`, 'green');
        log('='.repeat(50), 'green');
        
    } catch (error) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        log('');
        log('='.repeat(50), 'red');
        logError(`Deploy failed after ${duration}s: ${error.message}`);
        
        if (backupName) {
            log(`Backup available for rollback: ${backupName}`, 'yellow');
        }
        
        log('='.repeat(50), 'red');
        process.exit(1);
    }
}

// Rollback
async function rollback(options) {
    log('');
    log('⏪ Starting Rollback', 'magenta');
    log('='.repeat(50), 'blue');
    
    // Implementar lógica de rollback
    logStep('ROLLBACK', 'Rolling back to previous version...');
    
    try {
        // Listar backups disponíveis
        const backupsDir = path.join(__dirname, '../backups');
        const backups = await fs.readdir(backupsDir);
        const envBackups = backups.filter(backup => 
            backup.includes(`pre-deploy-${options.environment}`)
        ).sort().reverse();
        
        if (envBackups.length === 0) {
            throw new Error(`No backups found for environment ${options.environment}`);
        }
        
        const latestBackup = envBackups[0];
        logStep('ROLLBACK', `Using backup: ${latestBackup}`);
        
        // Restaurar backup
        const backupPath = path.join(backupsDir, latestBackup);
        const configPath = path.join(__dirname, '../config');
        
        await runCommand(`rm -rf ${configPath}`);
        await runCommand(`cp -r ${backupPath}/config ${configPath}`);
        
        // Restart da aplicação
        try {
            await runCommand('pm2 restart platform-devops');
        } catch (error) {
            logWarning('PM2 restart failed, application may need manual restart');
        }
        
        // Health check
        if (!await healthCheck(options.environment)) {
            throw new Error('Health check failed after rollback');
        }
        
        logSuccess('Rollback completed successfully');
        
    } catch (error) {
        logError(`Rollback failed: ${error.message}`);
        process.exit(1);
    }
}

// Main
async function main() {
    try {
        const options = parseArgs();
        
        if (options.rollback) {
            await rollback(options);
        } else {
            await deploy(options);
        }
    } catch (error) {
        logError(`Script error: ${error.message}`);
        process.exit(1);
    }
}

// Executar script se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { deploy, rollback };
