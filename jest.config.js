module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Padrões de arquivo de teste
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Diretórios a serem ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Configuração de cobertura
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/migrations/**',
    '!src/seeds/**'
  ],
  
  // Diretório de saída da cobertura
  coverageDirectory: 'coverage',
  
  // Formatos de relatório de cobertura
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Limites de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup antes dos testes
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Variáveis de ambiente para testes
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Timeout para testes
  testTimeout: 30000,
  
  // Configuração de mock
  clearMocks: true,
  restoreMocks: true,
  
  // Transformações
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Aliases de módulo
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Configuração de watch
  watchman: true,
  
  // Configuração para CI
  ci: process.env.CI === 'true',
  
  // Configuração de logs
  verbose: true,
  
  // Configuração de workers
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Configuração de retry para testes flaky
  retry: process.env.CI ? 2 : 0,
  
  // Configuração de cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Configuração de notificações (apenas em modo watch)
  notify: !process.env.CI,
  notifyMode: 'failure-change',
  
  // Configuração de bail (parar na primeira falha)
  bail: process.env.CI ? 1 : 0,
  
  // Configuração de detectOpenHandles (útil para debugging)
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Configuração global
  globals: {
    NODE_ENV: 'test'
  }
};
