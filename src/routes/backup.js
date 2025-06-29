const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const tar = require('tar');
const config = require('../config');
const logger = require('../utils/logger');
const { adminOrOperator } = require('../middleware/auth');

// Status do backup
let backupStatus = {
    running: false,
    lastBackup: null,
    nextScheduled: null,
    totalBackups: 0,
    totalSize: 0
};

// Obter status do backup
router.get('/status', (req, res) => {
    res.json({
        enabled: config.backupEnabled,
        status: backupStatus,
        configuration: {
            schedule: config.backupSchedule,
            retentionDays: config.backupRetentionDays,
            s3Bucket: config.backupS3Bucket
        },
        timestamp: new Date().toISOString()
    });
});

// Listar backups
router.get('/list', async (req, res) => {
    try {
        const backupsDir = path.join(__dirname, '../../backups');
        
        // Criar diretório se não existir
        await fs.mkdir(backupsDir, { recursive: true });
        
        const files = await fs.readdir(backupsDir);
        const backupFiles = files.filter(file => 
            file.endsWith('.tar.gz') || file.endsWith('.zip')
        );
        
        const backups = await Promise.all(
            backupFiles.map(async file => {
                const filePath = path.join(backupsDir, file);
                const stats = await fs.stat(filePath);
                
                return {
                    name: file,
                    size: stats.size,
                    sizeHuman: formatBytes(stats.size),
                    created: stats.birthtime,
                    modified: stats.mtime,
                    type: file.endsWith('.tar.gz') ? 'tar.gz' : 'zip'
                };
            })
        );
        
        // Ordenar por data de criação (mais recente primeiro)
        backups.sort((a, b) => b.created - a.created);
        
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
        
        res.json({
            backups,
            summary: {
                total: backups.length,
                totalSize,
                totalSizeHuman: formatBytes(totalSize),
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
                newestBackup: backups.length > 0 ? backups[0].created : null
            }
        });
        
    } catch (error) {
        logger.error('Failed to list backups:', error);
        res.status(500).json({
            error: 'Failed to list backups',
            message: error.message
        });
    }
});

// Criar backup manual
router.post('/create', adminOrOperator, async (req, res) => {
    try {
        if (!config.backupEnabled) {
            return res.status(403).json({
                error: 'Backup disabled',
                message: 'Backup feature is disabled in configuration'
            });
        }
        
        if (backupStatus.running) {
            return res.status(409).json({
                error: 'Backup in progress',
                message: 'Another backup is currently running'
            });
        }
        
        const { type = 'full', format = 'tar.gz', description } = req.body;
        
        if (!['full', 'config', 'logs', 'data'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid backup type',
                message: 'Backup type must be: full, config, logs, or data'
            });
        }
        
        if (!['tar.gz', 'zip'].includes(format)) {
            return res.status(400).json({
                error: 'Invalid format',
                message: 'Format must be tar.gz or zip'
            });
        }
        
        const backupId = generateBackupId();
        
        // Responder imediatamente
        res.json({
            message: 'Backup started',
            backupId,
            type,
            format,
            startedAt: new Date().toISOString()
        });
        
        // Executar backup em background
        executeBackup(backupId, type, format, description, req.user.username);
        
    } catch (error) {
        logger.error('Failed to start backup:', error);
        res.status(500).json({
            error: 'Failed to start backup',
            message: error.message
        });
    }
});

// Restaurar backup
router.post('/restore', adminOrOperator, async (req, res) => {
    try {
        const { backupFile, type = 'full' } = req.body;
        
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
        
        logger.backup('Restore started', 'started', {
            backupFile,
            type,
            user: req.user.username
        });
        
        res.json({
            message: 'Restore started',
            backupFile,
            type,
            startedAt: new Date().toISOString()
        });
        
        // Executar restore em background
        executeRestore(backupFile, type, req.user.username);
        
    } catch (error) {
        logger.error('Failed to start restore:', error);
        res.status(500).json({
            error: 'Failed to start restore',
            message: error.message
        });
    }
});

// Download de backup
router.get('/download/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(__dirname, '../../backups', filename);
        
        // Verificar se arquivo existe
        fs.access(backupPath)
            .then(() => {
                logger.info('Backup download started', {
                    filename,
                    user: req.user?.username || 'anonymous',
                    ip: req.ip
                });
                
                res.download(backupPath, filename, error => {
                    if (error) {
                        logger.error('Backup download failed:', error);
                    } else {
                        logger.info('Backup download completed', { filename });
                    }
                });
            })
            .catch(() => {
                res.status(404).json({
                    error: 'Backup not found',
                    message: `Backup file ${filename} not found`
                });
            });
            
    } catch (error) {
        logger.error('Backup download error:', error);
        res.status(500).json({
            error: 'Download failed',
            message: error.message
        });
    }
});

// Deletar backup
router.delete('/:filename', adminOrOperator, async (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(__dirname, '../../backups', filename);
        
        // Verificar se arquivo existe
        try {
            await fs.access(backupPath);
        } catch (error) {
            return res.status(404).json({
                error: 'Backup not found',
                message: `Backup file ${filename} not found`
            });
        }
        
        // Deletar arquivo
        await fs.unlink(backupPath);
        
        logger.backup('Backup deleted', 'success', {
            filename,
            user: req.user.username
        });
        
        res.json({
            message: 'Backup deleted successfully',
            filename,
            deletedAt: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Failed to delete backup:', error);
        res.status(500).json({
            error: 'Failed to delete backup',
            message: error.message
        });
    }
});

// Limpeza automática de backups antigos
router.post('/cleanup', adminOrOperator, async (req, res) => {
    try {
        const { daysToKeep = config.backupRetentionDays } = req.body;
        
        const backupsDir = path.join(__dirname, '../../backups');
        const files = await fs.readdir(backupsDir);
        const backupFiles = files.filter(file => 
            file.endsWith('.tar.gz') || file.endsWith('.zip')
        );
        
        const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
        const filesToDelete = [];
        
        for (const file of backupFiles) {
            const filePath = path.join(backupsDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.birthtime < cutoffDate) {
                filesToDelete.push({
                    name: file,
                    size: stats.size,
                    created: stats.birthtime
                });
                await fs.unlink(filePath);
            }
        }
        
        const totalSizeFreed = filesToDelete.reduce((sum, file) => sum + file.size, 0);
        
        logger.backup('Cleanup completed', 'success', {
            filesDeleted: filesToDelete.length,
            sizeFreed: totalSizeFreed,
            daysToKeep,
            user: req.user.username
        });
        
        res.json({
            message: 'Cleanup completed',
            filesDeleted: filesToDelete.length,
            sizeFreed: formatBytes(totalSizeFreed),
            files: filesToDelete
        });
        
    } catch (error) {
        logger.error('Backup cleanup failed:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            message: error.message
        });
    }
});

// Funções auxiliares
async function executeBackup(backupId, type, format, description, username) {
    backupStatus.running = true;
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${type}-backup-${timestamp}.${format}`;
        const backupPath = path.join(__dirname, '../../backups', filename);
        
        // Criar diretório de backups se não existir
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        
        logger.backup('Backup started', 'started', {
            backupId,
            type,
            format,
            filename,
            user: username
        });
        
        if (format === 'tar.gz') {
            await createTarBackup(backupPath, type);
        } else {
            await createZipBackup(backupPath, type);
        }
        
        // Atualizar status
        backupStatus.lastBackup = new Date();
        backupStatus.totalBackups++;
        
        const stats = await fs.stat(backupPath);
        backupStatus.totalSize += stats.size;
        
        logger.backup('Backup completed', 'success', {
            backupId,
            filename,
            size: stats.size,
            duration: Date.now() - new Date(backupId.split('-')[1]).getTime()
        });
        
    } catch (error) {
        logger.backup('Backup failed', 'failed', {
            backupId,
            error: error.message
        });
    } finally {
        backupStatus.running = false;
    }
}

async function createTarBackup(backupPath, type) {
    const filesToBackup = getFilesToBackup(type);
    
    await tar.create(
        {
            gzip: true,
            file: backupPath,
            cwd: path.join(__dirname, '../..')
        },
        filesToBackup
    );
}

async function createZipBackup(backupPath, type) {
    return new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', resolve);
        archive.on('error', reject);
        
        archive.pipe(output);
        
        const filesToBackup = getFilesToBackup(type);
        const baseDir = path.join(__dirname, '../..');
        
        filesToBackup.forEach(file => {
            const fullPath = path.join(baseDir, file);
            archive.file(fullPath, { name: file });
        });
        
        archive.finalize();
    });
}

function getFilesToBackup(type) {
    const commonFiles = [
        'package.json',
        'package-lock.json',
        '.env.example'
    ];
    
    switch (type) {
        case 'full':
            return [
                ...commonFiles,
                'src/',
                'public/',
                'logs/',
                'config/',
                'scripts/',
                'docker-compose.yml',
                'Dockerfile'
            ];
        case 'config':
            return [
                ...commonFiles,
                'config/',
                '.env'
            ];
        case 'logs':
            return ['logs/'];
        case 'data':
            return [
                'data/',
                'backups/',
                'uploads/'
            ];
        default:
            return commonFiles;
    }
}

async function executeRestore(backupFile, type, username) {
    try {
        const backupPath = path.join(__dirname, '../../backups', backupFile);
        const restoreDir = path.join(__dirname, '../../restore-temp');
        
        // Criar diretório temporário
        await fs.mkdir(restoreDir, { recursive: true });
        
        logger.backup('Restore started', 'started', {
            backupFile,
            type,
            user: username
        });
        
        // Extrair backup
        if (backupFile.endsWith('.tar.gz')) {
            await tar.extract({
                file: backupPath,
                cwd: restoreDir
            });
        } else {
            // Implementar extração de ZIP se necessário
            throw new Error('ZIP restore not implemented yet');
        }
        
        // Aplicar restore baseado no tipo
        await applyRestore(restoreDir, type);
        
        // Limpar diretório temporário
        await fs.rmdir(restoreDir, { recursive: true });
        
        logger.backup('Restore completed', 'success', {
            backupFile,
            type,
            user: username
        });
        
    } catch (error) {
        logger.backup('Restore failed', 'failed', {
            backupFile,
            error: error.message
        });
    }
}

async function applyRestore(restoreDir, type) {
    const baseDir = path.join(__dirname, '../..');
    
    switch (type) {
        case 'full':
            // Restaurar arquivos selecionados
            const filesToRestore = ['src/', 'config/', 'package.json'];
            for (const file of filesToRestore) {
                const srcPath = path.join(restoreDir, file);
                const dstPath = path.join(baseDir, file);
                
                try {
                    await fs.access(srcPath);
                    await copyRecursive(srcPath, dstPath);
                } catch (error) {
                    // Arquivo não existe no backup, ignorar
                }
            }
            break;
        case 'config':
            await copyRecursive(
                path.join(restoreDir, 'config'),
                path.join(baseDir, 'config')
            );
            break;
        case 'logs':
            await copyRecursive(
                path.join(restoreDir, 'logs'),
                path.join(baseDir, 'logs')
            );
            break;
        case 'data':
            await copyRecursive(
                path.join(restoreDir, 'data'),
                path.join(baseDir, 'data')
            );
            break;
    }
}

async function copyRecursive(src, dst) {
    const stats = await fs.stat(src);
    
    if (stats.isDirectory()) {
        await fs.mkdir(dst, { recursive: true });
        const files = await fs.readdir(src);
        
        for (const file of files) {
            await copyRecursive(
                path.join(src, file),
                path.join(dst, file)
            );
        }
    } else {
        await fs.mkdir(path.dirname(dst), { recursive: true });
        await fs.copyFile(src, dst);
    }
}

function generateBackupId() {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
