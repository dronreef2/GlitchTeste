// Servidor principal para Glitch - DevOps Platform (Compatible with Node 10+)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Configuração
const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting simples (compatível com Node 10)
const rateLimitMap = new Map();
const simpleRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.connection.remoteAddress;
    
    // Limpar entradas antigas
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now - data.resetTime > windowMs) {
        rateLimitMap.delete(ip);
      }
    }
    
    let clientData = rateLimitMap.get(key);
    if (!clientData || now - clientData.resetTime > windowMs) {
      clientData = { count: 0, resetTime: now };
      rateLimitMap.set(key, clientData);
    }
    
    clientData.count++;
    
    if (clientData.count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    next();
  };
};

// Middlewares básicos
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
app.use(simpleRateLimit());

// Logging simples
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`)
};

// Sistema de métricas simples
const metrics = {
  requests: 0,
  errors: 0,
  startTime: Date.now(),
  uptime: () => Date.now() - metrics.startTime
};

// Middleware de logging
app.use((req, res, next) => {
  metrics.requests++;
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    if (res.statusCode >= 400) {
      metrics.errors++;
    }
  });
  
  next();
});

// Função de autenticação básica
const authenticate = (req, res, next) => {
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
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 800px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(31,38,135,0.37);
        }
        h1 { font-size: 3rem; margin-bottom: 20px; }
        .subtitle { font-size: 1.2rem; opacity: 0.9; margin-bottom: 30px; }
        .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .link {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            text-decoration: none;
            color: white;
            border-radius: 10px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .status {
            margin-top: 30px;
            padding: 15px;
            background: rgba(34, 197, 94, 0.2);
            border-radius: 10px;
            border: 1px solid rgba(34, 197, 94, 0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 DevOps Platform</h1>
        <p class="subtitle">Plataforma completa rodando no Glitch</p>
        
        <div class="links">
            <a href="/dashboard" class="link">
                <strong>📊 Dashboard</strong><br>
                <small>Painel administrativo</small>
            </a>
            <a href="/api/health" class="link">
                <strong>🔍 Health Check</strong><br>
                <small>Status da API</small>
            </a>
            <a href="/api/metrics" class="link">
                <strong>📈 Métricas</strong><br>
                <small>Estatísticas do sistema</small>
            </a>
            <a href="/logs" class="link">
                <strong>📋 Logs</strong><br>
                <small>Visualizar logs</small>
            </a>
            <a href="/api/docs" class="link">
                <strong>📚 Documentação</strong><br>
                <small>API Documentation</small>
            </a>
        </div>
        
        <div class="status">
            <strong>✅ Sistema Online</strong><br>
            <small>Tempo de atividade: ${Math.floor(metrics.uptime() / 1000 / 60)} minutos</small>
        </div>
    </div>
</body>
</html>`;
  
  res.send(html);
});

// API Health Check
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: metrics.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage ? process.cpuUsage() : { user: 0, system: 0 }
  };
  
  res.json(health);
});

// API Métricas
app.get('/api/metrics', (req, res) => {
  const metricsData = {
    requests_total: metrics.requests,
    errors_total: metrics.errors,
    uptime_seconds: Math.floor(metrics.uptime() / 1000),
    memory_usage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    error_rate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) : 0
  };
  
  res.json(metricsData);
});

// Dashboard (protegido)
app.get('/dashboard', authenticate, (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - DevOps Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
            padding: 20px;
        }
        .header {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 10px 0;
            color: #4ecdc4;
        }
        .actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .action-btn {
            background: rgba(255,255,255,0.2);
            padding: 15px;
            text-decoration: none;
            color: white;
            border-radius: 8px;
            text-align: center;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .action-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .logout {
            text-align: center;
            margin-top: 30px;
        }
        .logout a {
            color: #ff6b6b;
            text-decoration: none;
        }
    </style>
    <script>
        function updateMetrics() {
            fetch('/api/metrics')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('requests').textContent = data.requests_total;
                    document.getElementById('errors').textContent = data.errors_total;
                    document.getElementById('uptime').textContent = Math.floor(data.uptime_seconds / 60) + 'm';
                    document.getElementById('memory').textContent = Math.round(data.memory_usage.heapUsed / 1024 / 1024) + 'MB';
                    document.getElementById('error-rate').textContent = data.error_rate + '%';
                })
                .catch(err => console.error('Erro ao buscar métricas:', err));
        }
        
        // Atualizar métricas a cada 5 segundos
        setInterval(updateMetrics, 5000);
        updateMetrics();
    </script>
</head>
<body>
    <div class="header">
        <h1>📊 Dashboard DevOps</h1>
        <p>Monitoramento em tempo real</p>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <h3>📊 Requisições</h3>
            <div class="metric-value" id="requests">${metrics.requests}</div>
            <small>Total de requisições</small>
        </div>
        <div class="metric-card">
            <h3>❌ Erros</h3>
            <div class="metric-value" id="errors">${metrics.errors}</div>
            <small>Total de erros</small>
        </div>
        <div class="metric-card">
            <h3>⏱️ Uptime</h3>
            <div class="metric-value" id="uptime">${Math.floor(metrics.uptime() / 1000 / 60)}m</div>
            <small>Tempo ativo</small>
        </div>
        <div class="metric-card">
            <h3>💾 Memória</h3>
            <div class="metric-value" id="memory">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</div>
            <small>Uso de RAM</small>
        </div>
        <div class="metric-card">
            <h3>📈 Taxa de Erro</h3>
            <div class="metric-value" id="error-rate">${metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) : 0}%</div>
            <small>Percentual de erros</small>
        </div>
    </div>
    
    <div class="actions">
        <a href="/api/health" class="action-btn">🔍 Health Check</a>
        <a href="/logs" class="action-btn">📋 Ver Logs</a>
        <a href="/api/restart" class="action-btn">🔄 Restart App</a>
        <a href="/api/docs" class="action-btn">📚 Documentação</a>
        <a href="/" class="action-btn">🏠 Página Inicial</a>
    </div>
    
    <div class="logout">
        <a href="/logout">🚪 Sair</a>
    </div>
</body>
</html>`;
  
  res.send(html);
});

// Logs (protegido)
app.get('/logs', authenticate, (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logs - DevOps Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Courier New', monospace;
            background: #1a1a1a;
            color: #00ff00;
            padding: 20px;
            min-height: 100vh;
        }
        .header {
            background: #333;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            color: white;
        }
        .log-container {
            background: #000;
            padding: 20px;
            border-radius: 5px;
            border: 1px solid #333;
            max-height: 400px;
            overflow-y: auto;
        }
        .log-entry {
            margin: 5px 0;
            padding: 5px;
            border-left: 3px solid #00ff00;
            padding-left: 10px;
        }
        .error { border-left-color: #ff0000; color: #ff6666; }
        .warn { border-left-color: #ffff00; color: #ffff66; }
        .back-btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: #4ecdc4;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Logs do Sistema</h1>
        <p>Logs em tempo real da aplicação</p>
    </div>
    
    <div class="log-container" id="logs">
        <div class="log-entry">[INFO] ${new Date().toISOString()} - Sistema iniciado</div>
        <div class="log-entry">[INFO] ${new Date().toISOString()} - Dashboard acessado</div>
        <div class="log-entry">[INFO] ${new Date().toISOString()} - ${metrics.requests} requisições processadas</div>
        <div class="log-entry">[INFO] ${new Date().toISOString()} - Uptime: ${Math.floor(metrics.uptime() / 1000)} segundos</div>
        ${metrics.errors > 0 ? `<div class="log-entry error">[ERROR] ${new Date().toISOString()} - ${metrics.errors} erros registrados</div>` : ''}
    </div>
    
    <a href="/dashboard" class="back-btn">← Voltar ao Dashboard</a>
</body>
</html>`;
  
  res.send(html);
});

// API Restart
app.post('/api/restart', authenticate, (req, res) => {
  log.info('Restart solicitado via API');
  res.json({ message: 'Aplicação será reiniciada em 3 segundos...' });
  
  setTimeout(() => {
    process.exit(0);
  }, 3000);
});

// API Documentação
app.get('/api/docs', (req, res) => {
  const docs = {
    title: 'DevOps Platform API',
    version: '1.0.0',
    endpoints: {
      'GET /': 'Página inicial',
      'GET /api/health': 'Health check da aplicação',
      'GET /api/metrics': 'Métricas do sistema',
      'GET /dashboard': 'Dashboard administrativo (requer auth)',
      'GET /logs': 'Visualizar logs (requer auth)',
      'POST /api/restart': 'Reiniciar aplicação (requer auth)',
      'GET /api/docs': 'Esta documentação'
    },
    authentication: 'Basic Auth via variáveis WEB_USERNAME e WEB_PASSWORD'
  };
  
  res.json(docs);
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/');
});

// Keep-alive
setInterval(() => {
  log.info(`Keep-alive - Uptime: ${Math.floor(metrics.uptime() / 1000)}s`);
}, 30000);

// Middleware de erro
app.use((err, req, res, next) => {
  metrics.errors++;
  log.error(`Erro: ${err.message}`);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Iniciar servidor
app.listen(PORT, () => {
  log.info(`🚀 DevOps Platform rodando na porta ${PORT}`);
  log.info(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  log.info(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});

module.exports = app;
