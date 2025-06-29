# 🔧 Backend API - Documentação Completa

Documentação completa da API backend da plataforma DevOps, incluindo endpoints, autenticação, middlewares e arquitetura.

---

## 📋 Índice

- [🏗️ Arquitetura da API](#️-arquitetura-da-api)
- [🔐 Autenticação e Segurança](#-autenticação-e-segurança)
- [📡 Endpoints da API](#-endpoints-da-api)
- [🔧 Middlewares](#-middlewares)
- [📊 Sistema de Métricas](#-sistema-de-métricas)
- [⚙️ Configuração e Setup](#️-configuração-e-setup)

---

## 🏗️ Arquitetura da API

### Stack Tecnológico

```javascript
// Principais dependências
{
  "express": "^4.18.2",           // Framework web
  "express-rate-limit": "^6.7.0", // Rate limiting
  "helmet": "^6.1.5",             // Segurança
  "cors": "^2.8.5",               // CORS
  "compression": "^1.7.4",        // Compressão
  "morgan": "^1.10.0",            // Logging
  "joi": "^17.9.2",               // Validação
  "jsonwebtoken": "^9.0.0",       // JWT
  "bcryptjs": "^2.4.3",           // Hash de senhas
  "redis": "^4.6.7",              // Cache
  "prometheus-api-metrics": "^3.2.2", // Métricas
  "winston": "^3.9.0",            // Logger avançado
  "socket.io": "^4.7.1"           // WebSocket
}
```

### Estrutura do Projeto

```
src/
├── controllers/        # Controllers da API
│   ├── auth.js
│   ├── deploy.js
│   ├── health.js
│   ├── metrics.js
│   └── services.js
├── middleware/         # Middlewares customizados
│   ├── auth.js
│   ├── validation.js
│   ├── rateLimiting.js
│   └── logging.js
├── routes/            # Definição das rotas
│   ├── api.js
│   ├── auth.js
│   └── admin.js
├── services/          # Lógica de negócio
│   ├── deployService.js
│   ├── monitorService.js
│   └── notificationService.js
├── utils/             # Utilitários
│   ├── logger.js
│   ├── redis.js
│   └── validators.js
└── app.js             # Aplicação principal
```

## 🔐 Autenticação e Segurança

### Sistema de Autenticação JWT

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Token inválido' 
      });
    }
    
    req.user = user;
    next();
  });
};

// Middleware de autorização por role
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Permissão insuficiente' 
      });
    }

    next();
  };
};

module.exports = {
  loginLimiter,
  authenticateToken,
  authorizeRole
};
```

### Controller de Autenticação

```javascript
// controllers/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const logger = require('../utils/logger');

// Schema de validação para login
const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required()
});

// Schema para criação de usuário
const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
  role: Joi.string().valid('admin', 'user', 'viewer').default('user')
});

class AuthController {
  
  // Login de usuário
  static async login(req, res) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: error.details[0].message 
        });
      }

      const { username, password } = value;
      
      // Aqui você verificaria no banco de dados
      // Para o exemplo, usando usuários hardcoded
      const users = [
        {
          id: 1,
          username: process.env.WEB_USERNAME || 'admin',
          password: await bcrypt.hash(process.env.WEB_PASSWORD || 'admin123', 10),
          role: 'admin',
          email: 'admin@company.com'
        }
      ];

      const user = users.find(u => u.username === username);
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        logger.warn(`Tentativa de login falhada para usuário: ${username}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({ 
          error: 'Credenciais inválidas' 
        });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      logger.info(`Login bem-sucedido para usuário: ${username}`, {
        userId: user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });

    } catch (error) {
      logger.error('Erro no login:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Refresh token requerido' 
        });
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ 
            error: 'Refresh token inválido' 
          });
        }

        const newToken = jwt.sign(
          { 
            id: user.id, 
            username: user.username, 
            role: user.role 
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({ 
          success: true, 
          token: newToken 
        });
      });

    } catch (error) {
      logger.error('Erro no refresh token:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Informações do usuário atual
  static async me(req, res) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
      
    } catch (error) {
      logger.error('Erro ao buscar informações do usuário:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Logout (adicionar token à blacklist se usando Redis)
  static async logout(req, res) {
    try {
      // Aqui você adicionaria o token à blacklist no Redis
      // redis.sadd('token_blacklist', req.token);
      
      logger.info(`Logout realizado para usuário: ${req.user.username}`);
      
      res.json({ 
        success: true, 
        message: 'Logout realizado com sucesso' 
      });
      
    } catch (error) {
      logger.error('Erro no logout:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }
}

module.exports = AuthController;
```

## 📡 Endpoints da API

### API de Health Check

```javascript
// controllers/health.js
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class HealthController {
  
  // Health check básico
  static async health(req, res) {
    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        node_version: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          system: Math.round(os.totalmem() / 1024 / 1024)
        },
        cpu: {
          architecture: os.arch(),
          platform: os.platform(),
          cores: os.cpus().length
        }
      };

      res.json(health);
      
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Health check detalhado
  static async healthDetailed(req, res) {
    try {
      const checks = {
        api: { status: 'ok', responseTime: Date.now() },
        database: await HealthController.checkDatabase(),
        redis: await HealthController.checkRedis(),
        external_services: await HealthController.checkExternalServices(),
        filesystem: await HealthController.checkFilesystem(),
        processes: await HealthController.checkProcesses()
      };

      const overallStatus = Object.values(checks).every(check => check.status === 'ok') ? 'ok' : 'degraded';
      
      checks.api.responseTime = Date.now() - checks.api.responseTime;

      res.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks
      });
      
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Verificar conectividade com banco de dados
  static async checkDatabase() {
    try {
      // Implementar verificação do banco de dados
      return { status: 'ok', responseTime: '< 10ms' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Verificar conectividade com Redis
  static async checkRedis() {
    try {
      // Implementar verificação do Redis
      return { status: 'ok', responseTime: '< 5ms' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Verificar serviços externos
  static async checkExternalServices() {
    try {
      const services = [];
      
      if (process.env.WEBHOOK_URL) {
        // Verificar webhook
        services.push({ name: 'webhook', status: 'ok' });
      }
      
      return { status: 'ok', services };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Verificar sistema de arquivos
  static async checkFilesystem() {
    try {
      const { stdout } = await execAsync('df -h /');
      const usage = stdout.split('\n')[1].split(/\s+/)[4];
      
      return {
        status: 'ok',
        disk_usage: usage,
        available_space: stdout.split('\n')[1].split(/\s+/)[3]
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Verificar processos críticos
  static async checkProcesses() {
    try {
      const processes = [];
      
      // Verificar se os processos críticos estão rodando
      const criticalProcesses = ['node', 'npm'];
      
      for (const processName of criticalProcesses) {
        try {
          await execAsync(`pgrep ${processName}`);
          processes.push({ name: processName, status: 'running' });
        } catch {
          processes.push({ name: processName, status: 'not_running' });
        }
      }
      
      return { status: 'ok', processes };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = HealthController;
```

### API de Deploy

```javascript
// controllers/deploy.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');
const DeployService = require('../services/deployService');

class DeployController {
  
  // Executar deploy
  static async deploy(req, res) {
    try {
      const { environment, version, rollback } = req.body;
      
      if (!environment) {
        return res.status(400).json({
          error: 'Environment é obrigatório'
        });
      }

      if (rollback) {
        return await DeployController.rollback(req, res);
      }

      const deployId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Iniciando deploy para ${environment}`, {
        deployId,
        version,
        user: req.user.username
      });

      // Executar deploy em background
      DeployService.executeDeploy({
        deployId,
        environment,
        version: version || 'latest',
        userId: req.user.id,
        username: req.user.username
      });

      res.json({
        success: true,
        deployId,
        message: `Deploy para ${environment} iniciado`,
        status: 'in_progress'
      });

    } catch (error) {
      logger.error('Erro no deploy:', error);
      res.status(500).json({
        error: 'Erro interno no deploy'
      });
    }
  }

  // Status do deploy
  static async deployStatus(req, res) {
    try {
      const { deployId } = req.params;
      
      const status = await DeployService.getDeployStatus(deployId);
      
      if (!status) {
        return res.status(404).json({
          error: 'Deploy não encontrado'
        });
      }

      res.json({
        success: true,
        deploy: status
      });

    } catch (error) {
      logger.error('Erro ao buscar status do deploy:', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  // Histórico de deploys
  static async deployHistory(req, res) {
    try {
      const { limit = 10, environment } = req.query;
      
      const history = await DeployService.getDeployHistory({
        limit: parseInt(limit),
        environment
      });

      res.json({
        success: true,
        deploys: history
      });

    } catch (error) {
      logger.error('Erro ao buscar histórico de deploys:', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  // Rollback
  static async rollback(req, res) {
    try {
      const { environment, version } = req.body;
      
      logger.info(`Iniciando rollback para ${environment}`, {
        version,
        user: req.user.username
      });

      const rollbackId = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Executar rollback em background
      DeployService.executeRollback({
        rollbackId,
        environment,
        version,
        userId: req.user.id,
        username: req.user.username
      });

      res.json({
        success: true,
        rollbackId,
        message: `Rollback para ${environment} iniciado`,
        status: 'in_progress'
      });

    } catch (error) {
      logger.error('Erro no rollback:', error);
      res.status(500).json({
        error: 'Erro interno no rollback'
      });
    }
  }

  // Configurações de deploy
  static async getConfig(req, res) {
    try {
      const config = {
        environments: ['development', 'staging', 'production'],
        available_versions: await DeployService.getAvailableVersions(),
        current_versions: await DeployService.getCurrentVersions()
      };

      res.json({
        success: true,
        config
      });

    } catch (error) {
      logger.error('Erro ao buscar configurações:', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = DeployController;
```

### API de Métricas

```javascript
// controllers/metrics.js
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MetricsController {
  
  // Métricas do sistema
  static async systemMetrics(req, res) {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: os.uptime(),
          loadavg: os.loadavg(),
          cpu: await MetricsController.getCpuMetrics(),
          memory: MetricsController.getMemoryMetrics(),
          disk: await MetricsController.getDiskMetrics(),
          network: await MetricsController.getNetworkMetrics()
        },
        application: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
          version: process.env.npm_package_version || '1.0.0',
          node_version: process.version,
          pid: process.pid
        }
      };

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      res.status(500).json({
        error: 'Erro ao coletar métricas',
        message: error.message
      });
    }
  }

  // Métricas da API
  static async apiMetrics(req, res) {
    try {
      // Aqui você coletaria métricas específicas da API
      // como número de requests, tempo de resposta, etc.
      
      const metrics = {
        timestamp: new Date().toISOString(),
        requests: {
          total: 0, // Implementar contador
          per_minute: 0,
          avg_response_time: 0,
          error_rate: 0
        },
        endpoints: {
          '/api/health': { count: 0, avg_time: 0 },
          '/api/deploy': { count: 0, avg_time: 0 },
          '/api/metrics': { count: 0, avg_time: 0 }
        },
        status_codes: {
          '200': 0,
          '400': 0,
          '401': 0,
          '403': 0,
          '404': 0,
          '500': 0
        }
      };

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      res.status(500).json({
        error: 'Erro ao coletar métricas da API',
        message: error.message
      });
    }
  }

  // Métricas em formato Prometheus
  static async prometheusMetrics(req, res) {
    try {
      const memory = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics = [
        `# HELP nodejs_memory_heap_used_bytes Node.js heap memory usage`,
        `# TYPE nodejs_memory_heap_used_bytes gauge`,
        `nodejs_memory_heap_used_bytes ${memory.heapUsed}`,
        '',
        `# HELP nodejs_memory_heap_total_bytes Node.js heap memory total`,
        `# TYPE nodejs_memory_heap_total_bytes gauge`,
        `nodejs_memory_heap_total_bytes ${memory.heapTotal}`,
        '',
        `# HELP nodejs_process_cpu_user_seconds_total Node.js CPU user time`,
        `# TYPE nodejs_process_cpu_user_seconds_total counter`,
        `nodejs_process_cpu_user_seconds_total ${cpuUsage.user / 1000000}`,
        '',
        `# HELP nodejs_process_cpu_system_seconds_total Node.js CPU system time`,
        `# TYPE nodejs_process_cpu_system_seconds_total counter`,
        `nodejs_process_cpu_system_seconds_total ${cpuUsage.system / 1000000}`,
        '',
        `# HELP nodejs_process_uptime_seconds Node.js process uptime`,
        `# TYPE nodejs_process_uptime_seconds gauge`,
        `nodejs_process_uptime_seconds ${process.uptime()}`,
        ''
      ].join('\n');

      res.set('Content-Type', 'text/plain');
      res.send(metrics);

    } catch (error) {
      res.status(500).json({
        error: 'Erro ao gerar métricas Prometheus',
        message: error.message
      });
    }
  }

  // Métodos auxiliares
  static async getCpuMetrics() {
    try {
      const cpus = os.cpus();
      const usage = await MetricsController.getCpuUsage();
      
      return {
        count: cpus.length,
        model: cpus[0].model,
        usage: usage
      };
    } catch (error) {
      return { count: 0, usage: 0 };
    }
  }

  static getMemoryMetrics() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      total: Math.round(total / 1024 / 1024),
      free: Math.round(free / 1024 / 1024),
      used: Math.round(used / 1024 / 1024),
      usage_percent: Math.round((used / total) * 100)
    };
  }

  static async getDiskMetrics() {
    try {
      const { stdout } = await execAsync('df -h /');
      const line = stdout.split('\n')[1];
      const parts = line.split(/\s+/);
      
      return {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        usage_percent: parts[4]
      };
    } catch (error) {
      return { total: '0', used: '0', available: '0', usage_percent: '0%' };
    }
  }

  static async getNetworkMetrics() {
    try {
      const interfaces = os.networkInterfaces();
      const stats = {};
      
      Object.keys(interfaces).forEach(name => {
        const iface = interfaces[name];
        const external = iface.find(details => 
          details.family === 'IPv4' && !details.internal
        );
        
        if (external) {
          stats[name] = {
            address: external.address,
            netmask: external.netmask,
            mac: external.mac
          };
        }
      });
      
      return stats;
    } catch (error) {
      return {};
    }
  }

  static async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime(startTime);
        
        const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000;
        const cpuPercent = (currentUsage.user + currentUsage.system) / totalTime * 100;
        
        resolve(Math.round(cpuPercent * 100) / 100);
      }, 100);
    });
  }
}

module.exports = MetricsController;
```

## 🔧 Middlewares

### Middleware de Rate Limiting

```javascript
// middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../utils/redis');

// Rate limiting geral
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para APIs críticas
const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:strict:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requests por minuto
  message: {
    error: 'Rate limit excedido para esta operação.',
    retryAfter: 60
  }
});

// Rate limiting para deploy
const deployLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:deploy:'
  }),
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // máximo 3 deploys por 5 minutos
  message: {
    error: 'Limite de deploys excedido. Aguarde 5 minutos.',
    retryAfter: 5 * 60
  }
});

module.exports = {
  generalLimiter,
  strictLimiter,
  deployLimiter
};
```

### Middleware de Validação

```javascript
// middleware/validation.js
const Joi = require('joi');

// Middleware genérico de validação
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errorMessages
      });
    }

    req[property] = value;
    next();
  };
};

// Schemas de validação comuns
const schemas = {
  deploy: Joi.object({
    environment: Joi.string().valid('development', 'staging', 'production').required(),
    version: Joi.string().optional(),
    rollback: Joi.boolean().default(false)
  }),

  user: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'user', 'viewer').default('user')
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

module.exports = { validate, schemas };
```

## 📊 Sistema de Métricas

### Configuração do Prometheus

```javascript
// utils/metrics.js
const promClient = require('prom-client');

// Criar registro de métricas
const register = new promClient.Registry();

// Métricas padrão do Node.js
promClient.collectDefaultMetrics({ register });

// Métricas customizadas
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections_total',
  help: 'Total number of active connections'
});

const deployCounter = new promClient.Counter({
  name: 'deploys_total',
  help: 'Total number of deploys',
  labelNames: ['environment', 'status']
});

const deployDuration = new promClient.Histogram({
  name: 'deploy_duration_seconds',
  help: 'Duration of deploys in seconds',
  labelNames: ['environment', 'status'],
  buckets: [10, 30, 60, 120, 300, 600]
});

// Registrar métricas
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(deployCounter);
register.registerMetric(deployDuration);

// Middleware para coletar métricas HTTP
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

module.exports = {
  register,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    deployCounter,
    deployDuration
  },
  metricsMiddleware
};
```

---

<div align="center">

**🔧 Backend API Completa e Robusta**

*Arquitetura escalável com todas as funcionalidades DevOps*

</div>
