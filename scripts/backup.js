#!/usr/bin/env node

/**
 * Script de Backup
 * Platform DevOps - Backup Script
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');
const tar = require('tar');

// Configuração
const config = {
    backupDir: path.join(__dirname, '../backups'),
    tempDir: path.join(__dirname, '../tmp'),
    retentionDays: 30,
    formats: ['zip', 'tar.gz'],
    defaultFormat: 'tar.gz',
    compression: 9,
    excludePatterns: [
        'node_modules',
        '.git',
        'tmp',
        '*.log',
        '.env',
        'backups'
    ]
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
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
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

// Executar comando
function execCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// Criar diretórios necessários
async function createDirectories() {
    try {
        await fs.mkdir(config.backupDir, { recursive: true });
        await fs.mkdir(config.tempDir, { recursive: true });
        logInfo('Backup directories created');
    } catch (error) {
        throw new Error(`Failed to create directories: ${error.message}`);
    }
}

// Gerar nome do backup
function generateBackupName(type, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = require('os').hostname();
    return `${type}-backup-${hostname}-${timestamp}.${format}`;
}

// Obter lista de arquivos para backup
async function getFilesToBackup(type, baseDir) {
    const allFiles = [];
    
    async function scanDirectory(dir, relativePath = '') {
        try {
            const items = await fs.readdir(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const itemRelativePath = path.join(relativePath, item);
                
                // Verificar se deve ser excluído
                if (shouldExclude(itemRelativePath)) {
                    continue;
                }
                
                const stats = await fs.stat(fullPath);
                
                if (stats.isDirectory()) {
                    await scanDirectory(fullPath, itemRelativePath);
                } else {
                    allFiles.push({
                        fullPath,
                        relativePath: itemRelativePath,
                        size: stats.size,
                        mtime: stats.mtime
                    });
                }
            }
        } catch (error) {
            logWarning(`Failed to scan directory ${dir}: ${error.message}`);
        }
    }
    
    const filesToInclude = getIncludePatternsForType(type);
    
    for (const pattern of filesToInclude) {
        const targetDir = path.join(baseDir, pattern);
        
        try {
            const stats = await fs.stat(targetDir);
            
            if (stats.isDirectory()) {
                await scanDirectory(targetDir, pattern);
            } else {
                allFiles.push({
                    fullPath: targetDir,
                    relativePath: pattern,
                    size: stats.size,
                    mtime: stats.mtime
                });
            }
        } catch (error) {
            logWarning(`Path ${pattern} not found, skipping`);
        }
    }
    
    return allFiles;
}

// Verificar se arquivo deve ser excluído
function shouldExclude(filePath) {
    return config.excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(filePath);
        }
        return filePath.includes(pattern);
    });
}

// Obter padrões de inclusão por tipo
function getIncludePatternsForType(type) {
    const patterns = {
        full: [
            'src',
            'config',
            'scripts',
            'public',
            'docs',
            'package.json',
            'package-lock.json',
            'docker-compose.yml',
            'Dockerfile',
            '.env.example'
        ],
        config: [
            'config',
            'package.json',
            '.env.example'
        ],
        code: [
            'src',
            'scripts',
            'public',
            'package.json',
            'package-lock.json'
        ],
        data: [
            'data',
            'uploads',
            'logs'
        ],
        logs: [
            'logs'
        ]
    };
    
    return patterns[type] || patterns.full;
}

// Criar backup ZIP
async function createZipBackup(files, outputPath) {
    return new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: config.compression }
        });
        
        let totalSize = 0;
        let processedFiles = 0;
        
        output.on('close', () => {
            logSuccess(`ZIP backup created: ${formatBytes(archive.pointer())} (${processedFiles} files)`);
            resolve({
                size: archive.pointer(),
                files: processedFiles
            });
        });
        
        archive.on('error', reject);
        
        archive.on('entry', (entry) => {
            processedFiles++;
            totalSize += entry.stats.size;
            
            if (processedFiles % 100 === 0) {
                logInfo(`Processed ${processedFiles} files...`);
            }
        });
        
        archive.pipe(output);
        
        // Adicionar arquivos ao ZIP
        files.forEach(file => {
            archive.file(file.fullPath, { name: file.relativePath });
        });
        
        archive.finalize();
    });
}

// Criar backup TAR.GZ
async function createTarGzBackup(files, outputPath) {
    const tempListFile = path.join(config.tempDir, 'backup-files.txt');
    
    try {
        // Criar lista de arquivos
        const fileList = files.map(file => file.relativePath).join('\n');
        await fs.writeFile(tempListFile, fileList);
        
        // Criar arquivo TAR.GZ
        const baseDir = path.join(__dirname, '..');
        await execCommand(`tar -czf "${outputPath}" -C "${baseDir}" -T "${tempListFile}"`);
        
        // Obter tamanho do arquivo criado
        const stats = await fs.stat(outputPath);
        
        logSuccess(`TAR.GZ backup created: ${formatBytes(stats.size)} (${files.length} files)`);
        
        return {
            size: stats.size,
            files: files.length
        };
        
    } finally {
        // Limpar arquivo temporário
        try {
            await fs.unlink(tempListFile);
        } catch (error) {
            // Ignorar erro
        }
    }
}

// Criar backup
async function createBackup(type = 'full', format = config.defaultFormat) {
    const startTime = Date.now();
    
    logInfo(`Starting ${type} backup in ${format} format...`);
    
    try {
        // Criar diretórios
        await createDirectories();
        
        // Gerar nome do backup
        const backupName = generateBackupName(type, format);
        const outputPath = path.join(config.backupDir, backupName);
        
        // Obter lista de arquivos
        const baseDir = path.join(__dirname, '..');
        logInfo('Scanning files...');
        const files = await getFilesToBackup(type, baseDir);
        
        if (files.length === 0) {
            throw new Error('No files found for backup');
        }
        
        logInfo(`Found ${files.length} files to backup`);
        
        // Criar backup baseado no formato
        let result;
        if (format === 'zip') {
            result = await createZipBackup(files, outputPath);
        } else if (format === 'tar.gz') {
            result = await createTarGzBackup(files, outputPath);
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        // Verificar se arquivo foi criado
        const stats = await fs.stat(outputPath);
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        const backupInfo = {
            name: backupName,
            path: outputPath,
            type,
            format,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            files: result.files,
            created: new Date().toISOString(),
            duration: `${duration}s`
        };
        
        // Salvar informações do backup
        await saveBackupInfo(backupInfo);
        
        logSuccess(`Backup completed successfully in ${duration}s`);
        logInfo(`File: ${backupName}`);
        logInfo(`Size: ${formatBytes(stats.size)} (${result.files} files)`);
        
        return backupInfo;
        
    } catch (error) {
        logError(`Backup failed: ${error.message}`);
        throw error;
    }
}

// Salvar informações do backup
async function saveBackupInfo(backupInfo) {
    try {
        const infoFile = path.join(config.backupDir, 'backup-info.json');
        let backupHistory = [];
        
        // Carregar histórico existente
        try {
            const existingData = await fs.readFile(infoFile, 'utf8');
            backupHistory = JSON.parse(existingData);
        } catch (error) {
            // Arquivo não existe ou está vazio
        }
        
        // Adicionar novo backup
        backupHistory.push(backupInfo);
        
        // Manter apenas os últimos 100 backups no histórico
        if (backupHistory.length > 100) {
            backupHistory = backupHistory.slice(-100);
        }
        
        // Salvar histórico atualizado
        await fs.writeFile(infoFile, JSON.stringify(backupHistory, null, 2));
        
    } catch (error) {
        logWarning(`Failed to save backup info: ${error.message}`);
    }
}

// Listar backups
async function listBackups() {
    try {
        const backupFiles = await fs.readdir(config.backupDir);
        const backups = [];
        
        for (const file of backupFiles) {
            if (file === 'backup-info.json') continue;
            
            const filePath = path.join(config.backupDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                backups.push({
                    name: file,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    created: stats.birthtime,
                    modified: stats.mtime,
                    age: formatAge(stats.birthtime)
                });
            }
        }
        
        // Ordenar por data de criação (mais recente primeiro)
        backups.sort((a, b) => b.created - a.created);
        
        if (backups.length === 0) {
            logInfo('No backups found');
            return [];
        }
        
        console.log('\n📦 Available Backups:');
        console.log('='.repeat(80));
        console.log('Name'.padEnd(50) + 'Size'.padEnd(12) + 'Age');
        console.log('='.repeat(80));
        
        backups.forEach(backup => {
            console.log(
                backup.name.padEnd(50) +
                backup.sizeFormatted.padEnd(12) +
                backup.age
            );
        });
        
        console.log('='.repeat(80));
        console.log(`Total: ${backups.length} backups, ${formatBytes(backups.reduce((sum, b) => sum + b.size, 0))}`);
        
        return backups;
        
    } catch (error) {
        logError(`Failed to list backups: ${error.message}`);
        return [];
    }
}

// Limpar backups antigos
async function cleanupBackups(days = config.retentionDays) {
    logInfo(`Cleaning up backups older than ${days} days...`);
    
    try {
        const backupFiles = await fs.readdir(config.backupDir);
        const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
        const filesToDelete = [];
        
        for (const file of backupFiles) {
            if (file === 'backup-info.json') continue;
            
            const filePath = path.join(config.backupDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile() && stats.birthtime < cutoffDate) {
                filesToDelete.push({
                    name: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime
                });
            }
        }
        
        if (filesToDelete.length === 0) {
            logInfo('No old backups to clean up');
            return { deleted: 0, sizeFreed: 0 };
        }
        
        let totalSizeFreed = 0;
        
        for (const file of filesToDelete) {
            await fs.unlink(file.path);
            totalSizeFreed += file.size;
            logInfo(`Deleted: ${file.name} (${formatBytes(file.size)})`);
        }
        
        logSuccess(`Cleanup completed: ${filesToDelete.length} files deleted, ${formatBytes(totalSizeFreed)} freed`);
        
        return {
            deleted: filesToDelete.length,
            sizeFreed: totalSizeFreed
        };
        
    } catch (error) {
        logError(`Cleanup failed: ${error.message}`);
        throw error;
    }
}

// Verificar integridade do backup
async function verifyBackup(backupName) {
    logInfo(`Verifying backup: ${backupName}`);
    
    const backupPath = path.join(config.backupDir, backupName);
    
    try {
        // Verificar se arquivo existe
        const stats = await fs.stat(backupPath);
        
        if (backupName.endsWith('.zip')) {
            // Verificar ZIP
            await execCommand(`unzip -t "${backupPath}"`);
        } else if (backupName.endsWith('.tar.gz')) {
            // Verificar TAR.GZ
            await execCommand(`tar -tzf "${backupPath}" > /dev/null`);
        } else {
            throw new Error('Unsupported backup format for verification');
        }
        
        logSuccess(`Backup ${backupName} is valid (${formatBytes(stats.size)})`);
        return true;
        
    } catch (error) {
        logError(`Backup verification failed: ${error.message}`);
        return false;
    }
}

// Utilitários
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatAge(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) {
        return `${diffDays}d ago`;
    } else if (diffHours > 0) {
        return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes}m ago`;
    } else {
        return 'just now';
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Platform DevOps - Backup Script');
        console.log('');
        console.log('Usage: node scripts/backup.js [command] [options]');
        console.log('');
        console.log('Commands:');
        console.log('  create [type] [format]  Create backup (default: full tar.gz)');
        console.log('  list                    List available backups');
        console.log('  cleanup [days]          Clean up backups older than X days');
        console.log('  verify <backup>         Verify backup integrity');
        console.log('');
        console.log('Types: full, config, code, data, logs');
        console.log('Formats: zip, tar.gz');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h             Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/backup.js create full zip');
        console.log('  node scripts/backup.js create config');
        console.log('  node scripts/backup.js list');
        console.log('  node scripts/backup.js cleanup 7');
        return;
    }
    
    const command = args[0] || 'create';
    
    try {
        switch (command) {
            case 'create':
                const type = args[1] || 'full';
                const format = args[2] || config.defaultFormat;
                await createBackup(type, format);
                break;
                
            case 'list':
                await listBackups();
                break;
                
            case 'cleanup':
                const days = parseInt(args[1]) || config.retentionDays;
                await cleanupBackups(days);
                break;
                
            case 'verify':
                const backupName = args[1];
                if (!backupName) {
                    logError('Backup name required for verification');
                    process.exit(1);
                }
                const isValid = await verifyBackup(backupName);
                process.exit(isValid ? 0 : 1);
                break;
                
            default:
                logError(`Unknown command: ${command}`);
                logInfo('Use --help for usage information');
                process.exit(1);
        }
        
    } catch (error) {
        logError(`Script error: ${error.message}`);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { createBackup, listBackups, cleanupBackups, verifyBackup };
