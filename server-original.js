// Servidor principal para Glitch - DevOps Platform
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Configuração
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de logs
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Limite de 1000 requests por IP
  message: 'Muitas requisições, tente novamente em 15 minutos'
});
app.use(limiter);

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Autenticação básica para algumas rotas
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    const username = process.env.WEB_USERNAME || 'admin';
    const password = process.env.WEB_PASSWORD || 'admin123';
    
    // Verificar se tem cookie de sessão
    if (req.cookies.session) {
      return next();
    }
    
    res.set('WWW-Authenticate', 'Basic realm="DevOps Platform"');
    return res.status(401).send('Autenticação necessária');
  }
  
  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  const validUsername = process.env.WEB_USERNAME || 'admin';
  const validPassword = process.env.WEB_PASSWORD || 'admin123';
  
  if (username === validUsername && password === validPassword) {
    res.cookie('session', 'authenticated', { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    next();
  } else {
    res.status(401).send('Credenciais inválidas');
  }
};

// Página inicial
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevOps Platform - Glitch</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(31,38,135,0.37);
            border: 1px solid rgba(255,255,255,0.18);
            max-width: 600px;
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        .subtitle { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .status { 
            display: inline-flex; 
            align-items: center; 
            background: #4CAF50; 
            padding: 0.5rem 1rem; 
            border-radius: 25px; 
            margin-bottom: 2rem;
        }
        .status::before { 
            content: '✅'; 
            margin-right: 0.5rem; 
        }
        .links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
        }
        .link {
            background: rgba(255,255,255,0.2);
            padding: 1rem;
            border-radius: 10px;
            text-decoration: none;
            color: white;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .link h3 { margin-bottom: 0.5rem; }
        .link p { font-size: 0.9rem; opacity: 0.8; }
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255,255,255,0.2);
            font-size: 0.9rem;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 DevOps Platform</h1>
        <p class="subtitle">Plataforma de automação completa rodando no Glitch</p>
        
        <div class="status">
            Sistema Online e Funcionando
        </div>
        
        <div class="links">
            <a href="/api/health" class="link">
                <h3>🔍 Health Check</h3>
                <p>Status dos serviços</p>
            </a>
            
            <a href="/api/metrics" class="link">
                <h3>📊 Métricas</h3>
                <p>Métricas do sistema</p>
            </a>
            
            <a href="/dashboard" class="link">
                <h3>🎛️ Dashboard</h3>
                <p>Painel de controle</p>
            </a>
            
            <a href="/api/docs" class="link">
                <h3>📚 API Docs</h3>
                <p>Documentação da API</p>
            </a>
        </div>
        
        <div class="footer">
            <p>Versão 1.0.0 | Desenvolvido para Glitch.com</p>
            <p>Uptime: ${process.uptime().toFixed(0)}s | Node.js ${process.version}</p>
        </div>
    </div>
</body>
</html>`;
  
  res.send(html);
});

// API Health Check
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    glitch: {
      project: process.env.PROJECT_NAME || 'devops-platform',
      domain: req.get('host')
    }
  };
  
  logger.info('Health check accessed', health);
  res.json(health);
});

// API Métricas
app.get('/api/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    },
    application: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: PORT
    },
    glitch: {
      project: process.env.PROJECT_NAME || 'devops-platform',
      domain: req.get('host'),
      ip: req.ip
    }
  };
  
  res.json(metrics);
});

// Dashboard protegido
app.get('/dashboard', basicAuth, (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevOps Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a1a;
            color: #fff;
            line-height: 1.6;
        }
        .header {
            background: #2d3748;
            padding: 1rem;
            border-bottom: 2px solid #4a5568;
        }
        .container { padding: 2rem; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .card {
            background: #2d3748;
            border-radius: 10px;
            padding: 1.5rem;
            border: 1px solid #4a5568;
        }
        .card h3 { color: #63b3ed; margin-bottom: 1rem; }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            margin: 0.5rem 0;
            padding: 0.5rem;
            background: #1a202c;
            border-radius: 5px;
        }
        .btn {
            background: #4299e1;
            color: white;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 0.25rem;
        }
        .btn:hover { background: #3182ce; }
        .status-ok { color: #48bb78; }
        .status-warning { color: #ed8936; }
        pre { 
            background: #1a202c; 
            padding: 1rem; 
            border-radius: 5px; 
            overflow-x: auto;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎛️ DevOps Dashboard</h1>
        <p>Monitoramento em tempo real</p>
    </div>
    
    <div class="container">
        <div class="grid">
            <div class="card">
                <h3>📊 Status do Sistema</h3>
                <div class="metric">
                    <span>Status:</span>
                    <span class="status-ok">Online ✅</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span>${Math.floor(process.uptime())}s</span>
                </div>
                <div class="metric">
                    <span>Memória:</span>
                    <span>${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</span>
                </div>
                <button class="btn" onclick="location.reload()">🔄 Atualizar</button>
            </div>
            
            <div class="card">
                <h3>🔧 Ações Rápidas</h3>
                <button class="btn" onclick="window.open('/api/health', '_blank')">🔍 Health Check</button>
                <button class="btn" onclick="window.open('/api/metrics', '_blank')">📈 Ver Métricas</button>
                <button class="btn" onclick="window.open('/logs', '_blank')">📋 Ver Logs</button>
                <button class="btn" onclick="restartApp()">🔄 Restart App</button>
            </div>
            
            <div class="card">
                <h3>🌐 Informações do Glitch</h3>
                <div class="metric">
                    <span>Projeto:</span>
                    <span>${process.env.PROJECT_NAME || 'devops-platform'}</span>
                </div>
                <div class="metric">
                    <span>Domínio:</span>
                    <span>${req.get('host')}</span>
                </div>
                <div class="metric">
                    <span>Node.js:</span>
                    <span>${process.version}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Métricas Detalhadas</h3>
                <pre id="metrics">Carregando...</pre>
                <button class="btn" onclick="loadMetrics()">🔄 Atualizar Métricas</button>
            </div>
        </div>
    </div>
    
    <script>
        function loadMetrics() {
            fetch('/api/metrics')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('metrics').textContent = JSON.stringify(data, null, 2);
                })
                .catch(e => {
                    document.getElementById('metrics').textContent = 'Erro ao carregar métricas: ' + e.message;
                });
        }
        
        function restartApp() {
            if (confirm('Tem certeza que deseja reiniciar a aplicação?')) {
                fetch('/api/restart', { method: 'POST' })
                    .then(() => {
                        alert('Aplicação reiniciada! A página será recarregada em 5 segundos.');
                        setTimeout(() => location.reload(), 5000);
                    })
                    .catch(e => alert('Erro ao reiniciar: ' + e.message));
            }
        }
        
        // Carregar métricas na inicialização
        loadMetrics();
        
        // Auto-refresh a cada 30 segundos
        setInterval(loadMetrics, 30000);
    </script>
</body>
</html>`;
  
  res.send(html);
});

// API para reiniciar (simulado)
app.post('/api/restart', basicAuth, (req, res) => {
  logger.info('Restart solicitado via API');
  res.json({ message: 'Restart iniciado', timestamp: new Date().toISOString() });
  
  // Simular restart (no Glitch, isso fará o projeto reiniciar)
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Logs
app.get('/logs', basicAuth, (req, res) => {
  try {
    const logs = fs.existsSync('app.log') ? fs.readFileSync('app.log', 'utf8') : 'Nenhum log encontrado';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Logs - DevOps Platform</title>
    <style>
        body { 
            font-family: monospace; 
            background: #1a1a1a; 
            color: #00ff00; 
            padding: 1rem; 
        }
        pre { 
            white-space: pre-wrap; 
            word-wrap: break-word; 
            background: #000; 
            padding: 1rem; 
            border-radius: 5px;
            border: 1px solid #333;
        }
        .header { 
            color: white; 
            margin-bottom: 1rem; 
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>📋 Logs da Aplicação</h2>
        <button onclick="location.reload()" style="background:#4299e1;color:white;border:none;padding:0.5rem 1rem;border-radius:5px;cursor:pointer;">🔄 Atualizar</button>
    </div>
    <pre>${logs}</pre>
</body>
</html>`;
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler logs', details: error.message });
  }
});

// Documentação da API
app.get('/api/docs', (req, res) => {
  const docs = {
    title: 'DevOps Platform API',
    version: '1.0.0',
    description: 'API para gerenciamento DevOps no Glitch',
    endpoints: {
      'GET /': 'Página inicial',
      'GET /api/health': 'Health check do sistema',
      'GET /api/metrics': 'Métricas do sistema',
      'GET /dashboard': 'Dashboard de monitoramento (requer auth)',
      'GET /logs': 'Visualizar logs (requer auth)',
      'POST /api/restart': 'Reiniciar aplicação (requer auth)',
      'GET /api/docs': 'Esta documentação'
    },
    authentication: {
      type: 'Basic Auth',
      username: process.env.WEB_USERNAME || 'admin',
      password: '[Configurado via variável de ambiente]'
    },
    environment: {
      node_version: process.version,
      platform: process.platform,
      uptime: process.uptime()
    }
  };
  
  res.json(docs);
});

// Middleware de erro
app.use((err, req, res, next) => {
  logger.error('Erro na aplicação:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/metrics',
      'GET /dashboard',
      'GET /logs',
      'GET /api/docs'
    ]
  });
});

// Keep-alive para o Glitch
setInterval(() => {
  logger.info('Keep-alive ping', { 
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed,
    timestamp: new Date().toISOString()
  });
}, 5 * 60 * 1000); // A cada 5 minutos

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 DevOps Platform iniciado na porta ${PORT}`);
  logger.info(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  logger.info(`🔍 Health: http://localhost:${PORT}/api/health`);
  logger.info(`📚 Docs: http://localhost:${PORT}/api/docs`);
  
  console.log(`
╔══════════════════════════════════════╗
║         🚀 DevOps Platform          ║
║                                      ║
║  Servidor rodando na porta ${PORT}       ║
║  Environment: ${process.env.NODE_ENV || 'development'}                ║
║  Node.js: ${process.version}                    ║
║                                      ║
║  🌐 Dashboard: /dashboard            ║
║  📊 Health: /api/health              ║
║  📚 Docs: /api/docs                  ║
╚══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, desligando graciosamente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, desligando graciosamente...');
  process.exit(0);
});

module.exports = app;
