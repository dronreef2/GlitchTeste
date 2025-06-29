import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');

// Configuração do teste
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up para 10 usuários
    { duration: '3m', target: 10 }, // Manter 10 usuários
    { duration: '2m', target: 20 }, // Ramp up para 20 usuários
    { duration: '5m', target: 20 }, // Manter 20 usuários
    { duration: '2m', target: 50 }, // Ramp up para 50 usuários
    { duration: '5m', target: 50 }, // Manter 50 usuários
    { duration: '2m', target: 0 },  // Ramp down para 0 usuários
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições em menos de 500ms
    http_req_failed: ['rate<0.1'],     // Taxa de erro menor que 10%
    errors: ['rate<0.1'],              // Taxa de erro customizada menor que 10%
  },
};

// URL base da API
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Dados de teste
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

// Função para fazer login e obter token
function login() {
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });
  
  return response.json('token');
}

// Função principal do teste
export default function () {
  // Fazer login
  const token = login();
  
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Teste 1: Health Check
  const healthResponse = http.get(`${BASE_URL}/api/health`, { headers });
  check(healthResponse, {
    'health status 200': (r) => r.status === 200,
    'health has status': (r) => r.json('status') === 'healthy',
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Teste 2: Métricas
  const metricsResponse = http.get(`${BASE_URL}/api/metrics`, { headers });
  check(metricsResponse, {
    'metrics status 200': (r) => r.status === 200,
    'metrics has system data': (r) => r.json('system') !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Teste 3: Deploy Status
  const deployResponse = http.get(`${BASE_URL}/api/deploy/status`, { headers });
  check(deployResponse, {
    'deploy status 200': (r) => r.status === 200,
    'deploy has deployments': (r) => r.json('deployments') !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Teste 4: Services Status
  const servicesResponse = http.get(`${BASE_URL}/api/services/status`, { headers });
  check(servicesResponse, {
    'services status 200': (r) => r.status === 200,
    'services has data': (r) => r.json('services') !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Teste 5: Backup List
  const backupResponse = http.get(`${BASE_URL}/api/backup/list`, { headers });
  check(backupResponse, {
    'backup status 200': (r) => r.status === 200,
    'backup has backups': (r) => r.json('backups') !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Teste 6: Config Get
  const configResponse = http.get(`${BASE_URL}/api/config`, { headers });
  check(configResponse, {
    'config status 200': (r) => r.status === 200,
    'config has settings': (r) => r.json('settings') !== undefined,
  }) || errorRate.add(1);
  
  sleep(2);
}

// Função executada na inicialização
export function setup() {
  console.log('Iniciando testes de performance...');
  
  // Verificar se a API está disponível
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`API não está disponível: ${response.status}`);
  }
  
  console.log('API está disponível, iniciando testes...');
}

// Função executada no final
export function teardown() {
  console.log('Testes de performance finalizados');
}
