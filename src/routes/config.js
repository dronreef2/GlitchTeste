const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { adminOnly } = require('../middleware/auth');

// Configuração em memória (em produção, usar banco de dados)
let runtimeConfig = { ...config };

// Obter configuração atual
router.get('/', (req, res) => {
    // Filtrar informações sensíveis
    const publicConfig = {
        application: {
            name: runtimeConfig.appName,
            version: runtimeConfig.appVersion,
            environment: runtimeConfig.nodeEnv
        },
        features: runtimeConfig.features,
        ports: {
            api: runtimeConfig.apiPort,
            websocket: runtimeConfig.websocketPort,
            monitoring: runtimeConfig.monitoringPort
        },
        monitoring: {
            enabled: runtimeConfig.metricsEnabled,
            healthCheckInterval: runtimeConfig.healthCheckInterval
        },
        deploy: {
            environment: runtimeConfig.deployEnv,
            branch: runtimeConfig.deployBranch,
            autoDeploy: runtimeConfig.autoDeploy,
            rollbackEnabled: runtimeConfig.rollbackEnabled
        },
        backup: {
            enabled: runtimeConfig.backupEnabled,
            schedule: runtimeConfig.backupSchedule,
            retentionDays: runtimeConfig.backupRetentionDays
        }
    };
    
    res.json({
        config: publicConfig,
        timestamp: new Date().toISOString()
    });
});

// Obter configuração específica
router.get('/:section', (req, res) => {
    const { section } = req.params;
    
    const sections = {
        application: {
            name: runtimeConfig.appName,
            version: runtimeConfig.appVersion,
            environment: runtimeConfig.nodeEnv
        },
        features: runtimeConfig.features,
        monitoring: {
            enabled: runtimeConfig.metricsEnabled,
            healthCheckInterval: runtimeConfig.healthCheckInterval,
            prometheusPort: runtimeConfig.prometheusPort
        },
        deploy: {
            environment: runtimeConfig.deployEnv,
            branch: runtimeConfig.deployBranch,
            autoDeploy: runtimeConfig.autoDeploy,
            rollbackEnabled: runtimeConfig.rollbackEnabled
        },
        backup: {
            enabled: runtimeConfig.backupEnabled,
            schedule: runtimeConfig.backupSchedule,
            retentionDays: runtimeConfig.backupRetentionDays
        },
        security: {
            corsOrigin: runtimeConfig.corsOrigin,
            rateLimiting: runtimeConfig.rateLimiting
        }
    };
    
    if (!sections[section]) {
        return res.status(404).json({
            error: 'Section not found',
            message: `Configuration section ${section} not found`,
            availableSections: Object.keys(sections)
        });
    }
    
    res.json({
        section,
        config: sections[section],
        timestamp: new Date().toISOString()
    });
});

// Atualizar configuração (somente admin)
router.put('/', adminOnly, async (req, res) => {
    try {
        const { config: newConfig } = req.body;
        
        if (!newConfig || typeof newConfig !== 'object') {
            return res.status(400).json({
                error: 'Invalid configuration',
                message: 'Configuration object is required'
            });
        }
        
        // Validar configuração
        const validationResult = validateConfig(newConfig);
        if (!validationResult.valid) {
            return res.status(400).json({
                error: 'Configuration validation failed',
                message: 'Invalid configuration values',
                errors: validationResult.errors
            });
        }
        
        // Backup da configuração atual
        const configBackup = { ...runtimeConfig };
        
        try {
            // Aplicar nova configuração
            runtimeConfig = { ...runtimeConfig, ...newConfig };
            
            // Salvar configuração em arquivo
            await saveConfigToFile(runtimeConfig);
            
            logger.info('Configuration updated', {
                user: req.user.username,
                changes: Object.keys(newConfig)
            });
            
            res.json({
                message: 'Configuration updated successfully',
                config: runtimeConfig,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            // Restaurar configuração em caso de erro
            runtimeConfig = configBackup;
            throw error;
        }
        
    } catch (error) {
        logger.error('Configuration update failed:', error);
        res.status(500).json({
            error: 'Configuration update failed',
            message: error.message
        });
    }
});

// Atualizar seção específica
router.put('/:section', adminOnly, async (req, res) => {
    try {
        const { section } = req.params;
        const { config: sectionConfig } = req.body;
        
        const validSections = ['features', 'monitoring', 'deploy', 'backup', 'security'];
        
        if (!validSections.includes(section)) {
            return res.status(400).json({
                error: 'Invalid section',
                message: `Section ${section} cannot be updated directly`,
                validSections
            });
        }
        
        if (!sectionConfig || typeof sectionConfig !== 'object') {
            return res.status(400).json({
                error: 'Invalid configuration',
                message: 'Configuration object is required'
            });
        }
        
        // Atualizar seção específica
        switch (section) {
            case 'features':
                runtimeConfig.features = { ...runtimeConfig.features, ...sectionConfig };
                break;
            case 'monitoring':
                Object.assign(runtimeConfig, sectionConfig);
                break;
            case 'deploy':
                Object.assign(runtimeConfig, sectionConfig);
                break;
            case 'backup':
                Object.assign(runtimeConfig, sectionConfig);
                break;
            case 'security':
                Object.assign(runtimeConfig, sectionConfig);
                break;
        }
        
        await saveConfigToFile(runtimeConfig);
        
        logger.info(`Configuration section ${section} updated`, {
            user: req.user.username,
            section,
            changes: Object.keys(sectionConfig)
        });
        
        res.json({
            message: `Section ${section} updated successfully`,
            section,
            config: section === 'features' ? runtimeConfig.features : sectionConfig,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error(`Configuration section ${req.params.section} update failed:`, error);
        res.status(500).json({
            error: 'Configuration update failed',
            message: error.message
        });
    }
});

// Reset configuração para padrões
router.post('/reset', adminOnly, async (req, res) => {
    try {
        const defaultConfig = require('../config');
        runtimeConfig = { ...defaultConfig };
        
        await saveConfigToFile(runtimeConfig);
        
        logger.info('Configuration reset to defaults', {
            user: req.user.username
        });
        
        res.json({
            message: 'Configuration reset to defaults',
            config: runtimeConfig,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Configuration reset failed:', error);
        res.status(500).json({
            error: 'Configuration reset failed',
            message: error.message
        });
    }
});

// Backup da configuração
router.post('/backup', adminOnly, async (req, res) => {
    try {
        const backupName = `config-backup-${Date.now()}.json`;
        const backupPath = path.join(__dirname, '../../backups', backupName);
        
        // Criar diretório de backup se não existir
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        
        // Salvar backup
        await fs.writeFile(backupPath, JSON.stringify(runtimeConfig, null, 2));
        
        logger.info('Configuration backup created', {
            user: req.user.username,
            backupFile: backupName
        });
        
        res.json({
            message: 'Configuration backup created',
            backupFile: backupName,
            path: backupPath,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Configuration backup failed:', error);
        res.status(500).json({
            error: 'Configuration backup failed',
            message: error.message
        });
    }
});

// Restaurar configuração de backup
router.post('/restore', adminOnly, async (req, res) => {
    try {
        const { backupFile } = req.body;
        
        if (!backupFile) {
            return res.status(400).json({
                error: 'Backup file required',
                message: 'Backup file name is required'
            });
        }
        
        const backupPath = path.join(__dirname, '../../backups', backupFile);
        
        // Verificar se arquivo existe
        try {
            await fs.access(backupPath);
        } catch (error) {
            return res.status(404).json({
                error: 'Backup file not found',
                message: `Backup file ${backupFile} not found`
            });
        }
        
        // Carregar backup
        const backupContent = await fs.readFile(backupPath, 'utf8');
        const backupConfig = JSON.parse(backupContent);
        
        // Validar configuração do backup
        const validationResult = validateConfig(backupConfig);
        if (!validationResult.valid) {
            return res.status(400).json({
                error: 'Invalid backup configuration',
                errors: validationResult.errors
            });
        }
        
        // Aplicar configuração do backup
        runtimeConfig = backupConfig;
        await saveConfigToFile(runtimeConfig);
        
        logger.info('Configuration restored from backup', {
            user: req.user.username,
            backupFile
        });
        
        res.json({
            message: 'Configuration restored from backup',
            backupFile,
            config: runtimeConfig,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Configuration restore failed:', error);
        res.status(500).json({
            error: 'Configuration restore failed',
            message: error.message
        });
    }
});

// Listar backups disponíveis
router.get('/backups', (req, res) => {
    const backupsDir = path.join(__dirname, '../../backups');
    
    fs.readdir(backupsDir)
        .then(files => {
            const configBackups = files
                .filter(file => file.startsWith('config-backup-') && file.endsWith('.json'))
                .map(async file => {
                    const filePath = path.join(backupsDir, file);
                    const stats = await fs.stat(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                });
            
            return Promise.all(configBackups);
        })
        .then(backups => {
            res.json({
                backups: backups.sort((a, b) => b.created - a.created),
                count: backups.length
            });
        })
        .catch(error => {
            if (error.code === 'ENOENT') {
                res.json({
                    backups: [],
                    count: 0,
                    message: 'No backups directory found'
                });
            } else {
                logger.error('Failed to list config backups:', error);
                res.status(500).json({
                    error: 'Failed to list backups',
                    message: error.message
                });
            }
        });
});

// Funções auxiliares
function validateConfig(config) {
    const errors = [];
    
    // Validar portas
    if (config.apiPort && (config.apiPort < 1024 || config.apiPort > 65535)) {
        errors.push('API port must be between 1024 and 65535');
    }
    
    if (config.websocketPort && (config.websocketPort < 1024 || config.websocketPort > 65535)) {
        errors.push('WebSocket port must be between 1024 and 65535');
    }
    
    // Validar environment
    if (config.nodeEnv && !['development', 'staging', 'production'].includes(config.nodeEnv)) {
        errors.push('Environment must be development, staging, or production');
    }
    
    // Validar log level
    if (config.logLevel && !['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
        errors.push('Log level must be debug, info, warn, or error');
    }
    
    // Validar backup retention days
    if (config.backupRetentionDays && (config.backupRetentionDays < 1 || config.backupRetentionDays > 365)) {
        errors.push('Backup retention days must be between 1 and 365');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

async function saveConfigToFile(config) {
    const configPath = path.join(__dirname, '../../config.runtime.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

module.exports = router;
