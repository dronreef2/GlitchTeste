# Guia de Testes - Plataforma DevOps

## Visão Geral

Este documento descreve a estratégia de testes implementada na plataforma DevOps, incluindo testes unitários, de integração, performance e segurança.

## Tipos de Testes

### 1. Testes Unitários

Testes focados em componentes individuais da aplicação.

**Localização:** `tests/unit/`

**Execução:**
```bash
npm run test:unit
```

**Cobertura:**
- Utilitários (`src/utils/`)
- Middlewares (`src/middleware/`)
- Configurações (`src/config/`)
- Funções auxiliares

### 2. Testes de Integração

Testes que verificam a integração entre componentes e APIs.

**Localização:** `tests/integration/`

**Execução:**
```bash
npm run test:integration
```

**Cobertura:**
- Endpoints de API
- Autenticação JWT
- Rate limiting
- Health checks
- Deploy endpoints

### 3. Testes de Performance

Testes de carga e stress usando K6.

**Localização:** `tests/performance/`

**Execução:**
```bash
# Teste de carga
npm run test:performance

# Teste de stress
npm run test:stress
```

**Métricas monitoradas:**
- Tempo de resposta
- Taxa de erro
- Throughput
- Utilização de recursos

### 4. Testes de Segurança

Análise de vulnerabilidades e auditoria de segurança.

**Execução:**
```bash
npm run security:check
```

**Verificações:**
- Vulnerabilidades em dependências
- Análise estática de código
- Verificação de configurações

## Configuração dos Testes

### Jest Configuration

O Jest está configurado com:
- Ambiente Node.js
- Cobertura de código automática
- Matchers customizados
- Setup global para mocks

**Arquivo:** `jest.config.js`

### Setup Global

Configurações globais incluem:
- Mock do logger
- Variáveis de ambiente de teste
- Timeouts
- Matchers customizados

**Arquivo:** `tests/setup.js`

## Estrutura dos Testes

```
tests/
├── unit/
│   ├── utils.test.js          # Testes de utilitários
│   ├── middleware.test.js     # Testes de middleware
│   └── config.test.js         # Testes de configuração
├── integration/
│   ├── api.test.js           # Testes de API
│   ├── auth.test.js          # Testes de autenticação
│   └── deploy.test.js        # Testes de deploy
├── performance/
│   ├── load-test.js          # Teste de carga
│   └── stress-test.js        # Teste de stress
└── setup.js                 # Setup global
```

## Comandos de Teste

### Desenvolvimento

```bash
# Executar todos os testes
npm test

# Executar em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage

# Executar apenas testes unitários
npm run test:unit

# Executar apenas testes de integração
npm run test:integration
```

### Performance

```bash
# Teste de carga básico
npm run test:performance

# Teste de stress
npm run test:stress

# Teste customizado com K6
k6 run --vus 50 --duration 5m tests/performance/load-test.js
```

### Análise de Código

```bash
# Lint do código
npm run lint

# Corrigir problemas de lint automaticamente
npm run lint:fix

# Verificação de segurança
npm run security:check
```

## CI/CD Integration

### GitHub Actions

Os testes são executados automaticamente no pipeline CI/CD:

1. **Testes Unitários:** Executados em todas as branches
2. **Testes de Integração:** Executados com serviços Docker
3. **Testes de Performance:** Executados apenas em staging
4. **Análise de Segurança:** Executada em todos os PRs

### Limites de Qualidade

**Cobertura de Código:**
- Linhas: 80%
- Funções: 80%
- Branches: 70%
- Statements: 80%

**Performance:**
- 95% das requisições < 500ms
- Taxa de erro < 10%

## Mocks e Stubs

### Logger Mock

```javascript
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));
```

### Database Mock

```javascript
const mockDb = {
  query: jest.fn(),
  close: jest.fn()
};
```

### Redis Mock

```javascript
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
};
```

## Matchers Customizados

### toBeValidDate

Verifica se o valor é uma data válida:

```javascript
expect(new Date()).toBeValidDate();
```

### toBeValidUUID

Verifica se o valor é um UUID válido:

```javascript
expect('550e8400-e29b-41d4-a716-446655440000').toBeValidUUID();
```

### toBeValidJWT

Verifica se o valor é um JWT válido:

```javascript
expect(token).toBeValidJWT();
```

## Debugging de Testes

### Executar teste específico

```bash
# Por arquivo
npm test -- tests/unit/utils.test.js

# Por padrão
npm test -- --testNamePattern="should validate email"

# Com debug
npm test -- --verbose --detectOpenHandles
```

### Variáveis de ambiente

```bash
# Debug do Jest
DEBUG=jest npm test

# Logs detalhados
VERBOSE=true npm test

# Timeout customizado
JEST_TIMEOUT=60000 npm test
```

## Relatórios

### Cobertura de Código

Relatórios são gerados em:
- `coverage/lcov-report/index.html` (HTML)
- `coverage/lcov.info` (LCOV)
- `coverage/coverage-final.json` (JSON)

### Performance

Relatórios K6 são salvos em:
- `reports/performance/`
- Formato JSON e HTML disponíveis

## Boas Práticas

### Testes Unitários

1. **Isolamento:** Cada teste deve ser independente
2. **Mocks:** Use mocks para dependências externas
3. **Nomenclatura:** Descreva claramente o que está sendo testado
4. **Arrange-Act-Assert:** Siga o padrão AAA

### Testes de Integração

1. **Setup/Teardown:** Configure e limpe o ambiente
2. **Dados de Teste:** Use dados consistentes
3. **Verificações:** Teste cenários reais de uso
4. **Error Handling:** Teste casos de erro

### Performance

1. **Baselines:** Estabeleça métricas de referência
2. **Monitoramento:** Use métricas em tempo real
3. **Cenários Reais:** Simule uso real da aplicação
4. **Análise:** Interprete resultados corretamente

## Troubleshooting

### Problemas Comuns

**Testes não encontrados:**
- Verifique os padrões de arquivo em `jest.config.js`
- Confirme que os arquivos estão nos diretórios corretos

**Timeouts:**
- Ajuste `testTimeout` no Jest config
- Use `jest.setTimeout()` para testes específicos

**Mocks não funcionando:**
- Verifique se os mocks estão no local correto
- Confirme que `jest.clearAllMocks()` está sendo chamado

**Performance tests falhando:**
- Verifique se a aplicação está executando
- Confirme as métricas de threshold no K6

### Recursos Adicionais

- [Jest Documentation](https://jestjs.io/docs)
- [K6 Documentation](https://k6.io/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [ESLint Documentation](https://eslint.org/docs)

## Contribuição

Para adicionar novos testes:

1. Crie o arquivo de teste na pasta apropriada
2. Siga as convenções de nomenclatura
3. Adicione ao pipeline CI/CD se necessário
4. Atualize a documentação

## Contato

Para dúvidas sobre testes, entre em contato com a equipe DevOps.
