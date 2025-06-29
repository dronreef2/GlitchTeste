const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { deployRateLimiter } = require('../middleware/rateLimiter');
const { adminOrOperator } = require('../middleware/auth');

// Store de deploys em memória (em produção, usar banco de dados)
const deployHistory = [];
let currentDeployment = null;

// Status dos ambientes
const environments = {
    development: {
        status: 'healthy',
        version: '1.0.0',
        lastDeploy: null,
        health: 'healthy'
    },
    staging: {
        status: 'healthy',
        version: '1.0.0',
        lastDeploy: null,
        health: 'healthy'
    },
    production: {
        status: 'healthy',
        version: '1.0.0',
        lastDeploy: null,
        health: 'healthy'
    }
};

// Obter status de deploy
router.get('/status', (req, res) => {
    res.json({
        current: currentDeployment,
        environments: environments,
        history: deployHistory.slice(-10), // Últimos 10 deploys
        features: {
            autoDeploy: config.autoDeploy,
            rollbackEnabled: config.rollbackEnabled,
            environments: Object.keys(environments)
        }
    });
});

// Obter histórico de deploys
router.get('/history', (req, res) => {
    const { limit = 20, environment, status } = req.query;
    
    let history = deployHistory;
    
    // Filtrar por ambiente
    if (environment) {
        history = history.filter(deploy => deploy.environment === environment);
    }
    
    // Filtrar por status
    if (status) {
        history = history.filter(deploy => deploy.status === status);
    }
    
    // Aplicar limite
    const limitedHistory = history.slice(-parseInt(limit));
    
    res.json({
        deploys: limitedHistory,
        total: history.length,
        filters: { environment, status, limit }
    });
});

// Iniciar deploy
router.post('/start', deployRateLimiter, adminOrOperator, async (req, res) => {
    try {
        const { environment = 'development', branch = 'main', version, rollback = false } = req.body;
        
        if (!environments[environment]) {
            return res.status(400).json({
                error: 'Invalid environment',
                message: `Environment ${environment} not found`,
                availableEnvironments: Object.keys(environments)
            });
        }
        
        if (currentDeployment && currentDeployment.status === 'running') {
            return res.status(409).json({
                error: 'Deploy in progress',
                message: 'Another deployment is currently running',
                currentDeployment
            });
        }
        
        // Criar registro de deploy
        const deployId = generateDeployId();
        const deployment = {
            id: deployId,
            environment,
            branch,
            version: version || generateVersion(),
            status: 'running',
            rollback,
            startedAt: new Date(),
            startedBy: req.user.username,
            steps: [],
            logs: []
        };
        
        currentDeployment = deployment;
        deployHistory.push(deployment);
        
        logger.deploy('Deploy started', environment, {
            deployId,
            branch,
            version: deployment.version,
            user: req.user.username,
            rollback
        });
        
        // Responder imediatamente
        res.json({
            message: 'Deploy started',
            deployment: {
                id: deployId,
                environment,
                status: 'running',
                startedAt: deployment.startedAt
            }
        });
        
        // Executar deploy em background
        executeDeploy(deployment);
        
    } catch (error) {
        logger.error('Deploy start failed:', error);
        res.status(500).json({
            error: 'Deploy failed to start',
            message: error.message
        });
    }
});

// Parar deploy
router.post('/stop', adminOrOperator, (req, res) => {
    try {
        if (!currentDeployment || currentDeployment.status !== 'running') {
            return res.status(400).json({
                error: 'No deploy running',
                message: 'No deployment is currently running'
            });
        }
        
        currentDeployment.status = 'cancelled';
        currentDeployment.endedAt = new Date();
        currentDeployment.cancelledBy = req.user.username;
        
        logger.deploy('Deploy cancelled', currentDeployment.environment, {
            deployId: currentDeployment.id,
            user: req.user.username
        });
        
        res.json({
            message: 'Deploy cancelled',
            deployment: currentDeployment
        });
        
        currentDeployment = null;
        
    } catch (error) {
        logger.error('Deploy stop failed:', error);
        res.status(500).json({
            error: 'Failed to stop deploy',
            message: error.message
        });
    }
});

// Rollback
router.post('/rollback', deployRateLimiter, adminOrOperator, async (req, res) => {
    try {
        const { environment, version } = req.body;
        
        if (!config.rollbackEnabled) {
            return res.status(403).json({
                error: 'Rollback disabled',
                message: 'Rollback feature is disabled in configuration'
            });
        }
        
        if (!environments[environment]) {
            return res.status(400).json({
                error: 'Invalid environment',
                message: `Environment ${environment} not found`
            });
        }
        
        if (currentDeployment && currentDeployment.status === 'running') {
            return res.status(409).json({
                error: 'Deploy in progress',
                message: 'Cannot rollback while deployment is running'
            });
        }
        
        // Buscar versão anterior se não especificada
        let rollbackVersion = version;
        if (!rollbackVersion) {
            const envHistory = deployHistory
                .filter(d => d.environment === environment && d.status === 'success')
                .slice(-2);
            
            if (envHistory.length < 2) {
                return res.status(400).json({
                    error: 'No version to rollback',
                    message: 'No previous successful deployment found'
                });
            }
            
            rollbackVersion = envHistory[0].version;
        }
        
        // Iniciar rollback
        const rollbackDeployment = {
            environment,
            branch: 'rollback',
            version: rollbackVersion,
            rollback: true
        };
        
        logger.deploy('Rollback started', environment, {
            version: rollbackVersion,
            user: req.user.username
        });
        
        res.json({
            message: 'Rollback started',
            environment,
            version: rollbackVersion
        });
        
        // Executar rollback
        const deployId = generateDeployId();
        const deployment = {
            id: deployId,
            environment,
            branch: 'rollback',
            version: rollbackVersion,
            status: 'running',
            rollback: true,
            startedAt: new Date(),
            startedBy: req.user.username,
            steps: [],
            logs: []
        };
        
        currentDeployment = deployment;
        deployHistory.push(deployment);
        
        executeDeploy(deployment);
        
    } catch (error) {
        logger.error('Rollback failed:', error);
        res.status(500).json({
            error: 'Rollback failed',
            message: error.message
        });
    }
});

// Obter logs de deploy
router.get('/logs/:deployId', (req, res) => {
    const { deployId } = req.params;
    
    const deployment = deployHistory.find(d => d.id === deployId);
    
    if (!deployment) {
        return res.status(404).json({
            error: 'Deploy not found',
            message: `Deployment ${deployId} not found`
        });
    }
    
    res.json({
        deployment: {
            id: deployment.id,
            environment: deployment.environment,
            status: deployment.status,
            startedAt: deployment.startedAt,
            endedAt: deployment.endedAt
        },
        logs: deployment.logs,
        steps: deployment.steps
    });
});

// Healthcheck dos ambientes
router.get('/health', async (req, res) => {
    try {
        const healthChecks = {};
        
        for (const [env, data] of Object.entries(environments)) {
            try {
                const health = await checkEnvironmentHealth(env);
                healthChecks[env] = {
                    status: health.healthy ? 'healthy' : 'unhealthy',
                    version: data.version,
                    lastDeploy: data.lastDeploy,
                    details: health.details
                };
            } catch (error) {
                healthChecks[env] = {
                    status: 'error',
                    error: error.message
                };
            }
        }
        
        const overallHealth = Object.values(healthChecks).every(h => h.status === 'healthy');
        
        res.json({
            overall: overallHealth ? 'healthy' : 'degraded',
            environments: healthChecks,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            error: 'Health check failed',
            message: error.message
        });
    }
});

// Webhook para auto-deploy (GitHub, GitLab, etc.)
router.post('/webhook', async (req, res) => {
    try {
        if (!config.autoDeploy) {
            return res.status(403).json({
                error: 'Auto-deploy disabled',
                message: 'Auto-deploy feature is disabled'
            });
        }
        
        const { ref, repository, pusher } = req.body;
        
        // Verificar se é o branch configurado
        if (ref !== `refs/heads/${config.deployBranch}`) {
            return res.json({
                message: 'Branch ignored',
                branch: ref
            });
        }
        
        logger.deploy('Webhook received', 'auto', {
            repository: repository?.name,
            branch: ref,
            pusher: pusher?.name
        });
        
        // Disparar auto-deploy para desenvolvimento
        const deployId = generateDeployId();
        const deployment = {
            id: deployId,
            environment: 'development',
            branch: config.deployBranch,
            version: generateVersion(),
            status: 'running',
            rollback: false,
            startedAt: new Date(),
            startedBy: 'webhook',
            steps: [],
            logs: [],
            webhook: true
        };
        
        currentDeployment = deployment;
        deployHistory.push(deployment);
        
        res.json({
            message: 'Auto-deploy triggered',
            deployId
        });
        
        executeDeploy(deployment);
        
    } catch (error) {
        logger.error('Webhook deploy failed:', error);
        res.status(500).json({
            error: 'Webhook deploy failed',
            message: error.message
        });
    }
});

// Funções auxiliares
async function executeDeploy(deployment) {
    try {
        addDeployStep(deployment, 'started', 'Deploy started');
        
        // Simular passos de deploy
        const steps = [
            { name: 'validation', description: 'Validating deployment configuration' },
            { name: 'preparation', description: 'Preparing deployment environment' },
            { name: 'build', description: 'Building application' },
            { name: 'test', description: 'Running tests' },
            { name: 'deploy', description: 'Deploying to environment' },
            { name: 'verification', description: 'Verifying deployment' }
        ];
        
        for (const step of steps) {
            if (deployment.status === 'cancelled') {
                break;
            }
            
            addDeployStep(deployment, step.name, step.description);
            
            // Simular tempo de execução
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
            
            // Simular possível falha (5% de chance)
            if (Math.random() < 0.05) {
                throw new Error(`Step ${step.name} failed`);
            }
            
            addDeployLog(deployment, `✅ ${step.description} completed`);
        }
        
        if (deployment.status !== 'cancelled') {
            // Deploy bem-sucedido
            deployment.status = 'success';
            deployment.endedAt = new Date();
            
            // Atualizar ambiente
            environments[deployment.environment].version = deployment.version;
            environments[deployment.environment].lastDeploy = deployment.endedAt;
            environments[deployment.environment].status = 'healthy';
            
            addDeployStep(deployment, 'completed', 'Deploy completed successfully');
            
            logger.deploy('Deploy completed', deployment.environment, {
                deployId: deployment.id,
                version: deployment.version,
                duration: deployment.endedAt - deployment.startedAt
            });
        }
        
    } catch (error) {
        // Deploy falhou
        deployment.status = 'failed';
        deployment.endedAt = new Date();
        deployment.error = error.message;
        
        addDeployStep(deployment, 'failed', `Deploy failed: ${error.message}`);
        addDeployLog(deployment, `❌ Deploy failed: ${error.message}`);
        
        logger.error('Deploy failed:', {
            deployId: deployment.id,
            environment: deployment.environment,
            error: error.message
        });
    } finally {
        currentDeployment = null;
    }
}

function addDeployStep(deployment, name, description) {
    deployment.steps.push({
        name,
        description,
        timestamp: new Date(),
        status: name === 'failed' ? 'failed' : 'completed'
    });
}

function addDeployLog(deployment, message) {
    deployment.logs.push({
        timestamp: new Date(),
        message
    });
}

function generateDeployId() {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

function generateVersion() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day}-${hour}${minute}`;
}

async function checkEnvironmentHealth(environment) {
    // Simular verificação de saúde
    return new Promise((resolve) => {
        setTimeout(() => {
            const healthy = Math.random() > 0.1; // 90% de chance de estar saudável
            resolve({
                healthy,
                details: {
                    responseTime: Math.floor(Math.random() * 500) + 50,
                    status: healthy ? 'ok' : 'error',
                    checks: ['database', 'cache', 'api'].map(check => ({
                        name: check,
                        status: healthy ? 'ok' : 'error'
                    }))
                }
            });
        }, 1000);
    });
}

module.exports = router;
