const request = require('supertest');
const app = require('../../src/server');

describe('API Health Endpoints', () => {
  afterAll(async () => {
    // Fechar conexões do servidor se necessário
    if (app.close) {
      await app.close();
    }
  });

  describe('GET /api/health', () => {
    it('deve retornar status 200 e informações de saúde', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('api');
    });

    it('deve incluir informações do sistema', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system).toHaveProperty('disk');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('deve retornar informações detalhadas de saúde', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('checks');
      expect(Array.isArray(response.body.checks)).toBe(true);
      expect(response.body).toHaveProperty('dependencies');
    });
  });

  describe('GET /api/health/live', () => {
    it('deve retornar liveness probe', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('GET /api/health/ready', () => {
    it('deve retornar readiness probe', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('dependencies');
    });
  });
});

describe('API Metrics Endpoints', () => {
  describe('GET /api/metrics', () => {
    it('deve retornar métricas do sistema', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('application');
      expect(response.body).toHaveProperty('business');
    });

    it('deve incluir métricas de performance', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.application).toHaveProperty('requests');
      expect(response.body.application).toHaveProperty('errors');
    });
  });

  describe('GET /api/metrics/prometheus', () => {
    it('deve retornar métricas no formato Prometheus', async () => {
      const response = await request(app)
        .get('/api/metrics/prometheus')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });
});

describe('API Auth Endpoints', () => {
  const validUser = {
    username: 'admin',
    password: 'admin123'
  };

  const invalidUser = {
    username: 'invalid',
    password: 'wrong'
  };

  describe('POST /api/auth/login', () => {
    it('deve autenticar usuário válido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validUser)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', validUser.username);
    });

    it('deve rejeitar usuário inválido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidUser)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Credenciais inválidas');
    });

    it('deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('deve fazer logout do usuário', async () => {
      // Primeiro fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(validUser);

      const token = loginResponse.body.token;

      // Depois fazer logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar informações do usuário autenticado', async () => {
      // Primeiro fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(validUser);

      const token = loginResponse.body.token;

      // Depois buscar informações
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', validUser.username);
    });

    it('deve rejeitar acesso sem token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('API Deploy Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    // Fazer login para obter token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = loginResponse.body.token;
  });

  describe('GET /api/deploy/status', () => {
    it('deve retornar status dos deploys', async () => {
      const response = await request(app)
        .get('/api/deploy/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('deployments');
      expect(Array.isArray(response.body.deployments)).toBe(true);
    });
  });

  describe('GET /api/deploy/history', () => {
    it('deve retornar histórico de deploys', async () => {
      const response = await request(app)
        .get('/api/deploy/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('history');
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('POST /api/deploy/execute', () => {
    it('deve executar deploy', async () => {
      const deployConfig = {
        service: 'api',
        environment: 'staging',
        version: '1.0.0'
      };

      const response = await request(app)
        .post('/api/deploy/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deployConfig)
        .expect(200);

      expect(response.body).toHaveProperty('deploymentId');
      expect(response.body).toHaveProperty('status');
    });

    it('deve validar parâmetros de deploy', async () => {
      const response = await request(app)
        .post('/api/deploy/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/deploy/rollback', () => {
    it('deve executar rollback', async () => {
      const rollbackConfig = {
        deploymentId: 'deploy-123',
        version: '0.9.0'
      };

      const response = await request(app)
        .post('/api/deploy/rollback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rollbackConfig)
        .expect(200);

      expect(response.body).toHaveProperty('rollbackId');
      expect(response.body).toHaveProperty('status');
    });
  });
});

describe('Rate Limiting', () => {
  it('deve aplicar rate limiting', async () => {
    // Fazer muitas requisições rapidamente
    const promises = Array(110).fill().map(() => 
      request(app).get('/api/health')
    );

    const responses = await Promise.all(promises);
    
    // Algumas requisições devem ser bloqueadas
    const blockedRequests = responses.filter(res => res.status === 429);
    expect(blockedRequests.length).toBeGreaterThan(0);
  });
});

describe('Error Handling', () => {
  it('deve tratar endpoint não encontrado', async () => {
    const response = await request(app)
      .get('/api/endpoint-inexistente')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('não encontrado');
  });

  it('deve tratar erro interno do servidor', async () => {
    // Simular erro interno através de endpoint específico
    const response = await request(app)
      .get('/api/test/error')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});
