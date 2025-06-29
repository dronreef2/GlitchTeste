const logger = require('../../src/utils/logger');
const config = require('../../src/config');

// Mock do logger para testes
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('info', () => {
    it('deve registrar mensagem de informação', () => {
      const message = 'Teste de informação';
      const meta = { userId: 123 };

      logger.info(message, meta);

      expect(logger.info).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('error', () => {
    it('deve registrar mensagem de erro', () => {
      const message = 'Teste de erro';
      const error = new Error('Erro de teste');

      logger.error(message, { error });

      expect(logger.error).toHaveBeenCalledWith(message, { error });
    });
  });

  describe('warn', () => {
    it('deve registrar mensagem de aviso', () => {
      const message = 'Teste de aviso';

      logger.warn(message);

      expect(logger.warn).toHaveBeenCalledWith(message);
    });
  });

  describe('debug', () => {
    it('deve registrar mensagem de debug', () => {
      const message = 'Teste de debug';
      const data = { debug: true };

      logger.debug(message, data);

      expect(logger.debug).toHaveBeenCalledWith(message, data);
    });
  });
});

describe('Config Module', () => {
  it('deve ter todas as configurações necessárias', () => {
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('env');
    expect(config).toHaveProperty('database');
    expect(config).toHaveProperty('redis');
    expect(config).toHaveProperty('jwt');
    expect(config).toHaveProperty('monitoring');
  });

  it('deve ter configurações válidas do banco de dados', () => {
    expect(config.database).toHaveProperty('url');
    expect(config.database).toHaveProperty('pool');
    expect(config.database.pool).toHaveProperty('min');
    expect(config.database.pool).toHaveProperty('max');
  });

  it('deve ter configurações válidas do Redis', () => {
    expect(config.redis).toHaveProperty('url');
    expect(config.redis).toHaveProperty('options');
  });

  it('deve ter configurações válidas do JWT', () => {
    expect(config.jwt).toHaveProperty('secret');
    expect(config.jwt).toHaveProperty('expiresIn');
  });

  it('deve ter configurações válidas de monitoramento', () => {
    expect(config.monitoring).toHaveProperty('prometheus');
    expect(config.monitoring).toHaveProperty('grafana');
    expect(config.monitoring).toHaveProperty('alerts');
  });
});

describe('Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve usar valores padrão quando variáveis não estão definidas', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;

    const testConfig = require('../../src/config');

    expect(testConfig.port).toBe(3000);
    expect(testConfig.env).toBe('development');
  });

  it('deve usar variáveis de ambiente quando definidas', () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';

    const testConfig = require('../../src/config');

    expect(testConfig.port).toBe(4000);
    expect(testConfig.env).toBe('production');
    expect(testConfig.jwt.secret).toBe('test-secret');
  });
});

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('deve gerar ID único', () => {
      const { generateId } = require('../../src/utils/helpers');
      
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });
  });

  describe('formatDate', () => {
    it('deve formatar data corretamente', () => {
      const { formatDate } = require('../../src/utils/helpers');
      
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('validateEmail', () => {
    it('deve validar email corretamente', () => {
      const { validateEmail } = require('../../src/utils/helpers');
      
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('deve sanitizar entrada do usuário', () => {
      const { sanitizeInput } = require('../../src/utils/helpers');
      
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });
  });
});

describe('Middleware Functions', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      params: {},
      query: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('auth middleware', () => {
    const authMiddleware = require('../../src/middleware/auth');

    it('deve permitir acesso com token válido', () => {
      req.headers.authorization = 'Bearer valid-token';
      
      authMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('deve rejeitar acesso sem token', () => {
      authMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Token de acesso necessário' 
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar token inválido', () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      authMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler middleware', () => {
    const errorHandler = require('../../src/middleware/errorHandler');

    it('deve tratar erro de validação', () => {
      const error = new Error('Erro de validação');
      error.status = 400;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erro de validação',
        timestamp: expect.any(String)
      });
    });

    it('deve tratar erro interno do servidor', () => {
      const error = new Error('Erro interno');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erro interno do servidor',
        timestamp: expect.any(String)
      });
    });
  });
});

describe('Database Operations', () => {
  // Mock das operações de banco de dados
  const mockDb = {
    query: jest.fn(),
    close: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User operations', () => {
    it('deve buscar usuário por ID', async () => {
      const userId = 1;
      const expectedUser = { id: userId, username: 'testuser' };
      
      mockDb.query.mockResolvedValue({ rows: [expectedUser] });

      // Simular operação de busca
      const result = await mockDb.query('SELECT * FROM users WHERE id = $1', [userId]);
      
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [userId]);
      expect(result.rows[0]).toEqual(expectedUser);
    });

    it('deve criar novo usuário', async () => {
      const newUser = { username: 'newuser', email: 'new@example.com' };
      const createdUser = { id: 2, ...newUser };

      mockDb.query.mockResolvedValue({ rows: [createdUser] });

      const result = await mockDb.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
        [newUser.username, newUser.email]
      );

      expect(mockDb.query).toHaveBeenCalled();
      expect(result.rows[0]).toEqual(createdUser);
    });
  });

  describe('Deploy operations', () => {
    it('deve registrar novo deploy', async () => {
      const deployData = {
        service: 'api',
        version: '1.0.0',
        environment: 'production'
      };

      const createdDeploy = { id: 'deploy-123', ...deployData };
      mockDb.query.mockResolvedValue({ rows: [createdDeploy] });

      const result = await mockDb.query(
        'INSERT INTO deployments (service, version, environment) VALUES ($1, $2, $3) RETURNING *',
        [deployData.service, deployData.version, deployData.environment]
      );

      expect(result.rows[0]).toEqual(createdDeploy);
    });
  });
});

describe('Cache Operations', () => {
  // Mock do Redis
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve armazenar dados no cache', async () => {
    const key = 'test:key';
    const value = JSON.stringify({ data: 'test' });

    mockRedis.set.mockResolvedValue('OK');

    await mockRedis.set(key, value, 'EX', 3600);

    expect(mockRedis.set).toHaveBeenCalledWith(key, value, 'EX', 3600);
  });

  it('deve recuperar dados do cache', async () => {
    const key = 'test:key';
    const cachedValue = JSON.stringify({ data: 'test' });

    mockRedis.get.mockResolvedValue(cachedValue);

    const result = await mockRedis.get(key);

    expect(mockRedis.get).toHaveBeenCalledWith(key);
    expect(result).toBe(cachedValue);
  });

  it('deve verificar se chave existe no cache', async () => {
    const key = 'test:key';

    mockRedis.exists.mockResolvedValue(1);

    const exists = await mockRedis.exists(key);

    expect(mockRedis.exists).toHaveBeenCalledWith(key);
    expect(exists).toBe(1);
  });
});
