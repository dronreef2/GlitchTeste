import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('stress_errors');

// Configuração de teste de stress
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up para 50 usuários
    { duration: '5m', target: 100 },  // Ramp up para 100 usuários
    { duration: '2m', target: 200 },  // Ramp up para 200 usuários
    { duration: '5m', target: 300 },  // Ramp up para 300 usuários
    { duration: '2m', target: 400 },  // Ramp up para 400 usuários
    { duration: '5m', target: 500 },  // Ramp up para 500 usuários (stress)
    { duration: '10m', target: 500 }, // Manter 500 usuários
    { duration: '5m', target: 0 },    // Ramp down para 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requisições em menos de 2s
    http_req_failed: ['rate<0.3'],     // Taxa de erro menor que 30%
    stress_errors: ['rate<0.3'],       // Taxa de erro customizada menor que 30%
  },
};

// URL base da API
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Pool de usuários de teste
const USERS = [
  { username: 'admin', password: 'admin123' },
  { username: 'user1', password: 'user123' },
  { username: 'user2', password: 'user123' },
  { username: 'user3', password: 'user123' },
];

// Cache de tokens
let tokenCache = {};

// Função para obter token (com cache)
function getToken(user) {
  const userKey = `${user.username}:${user.password}`;
  
  if (tokenCache[userKey]) {
    return tokenCache[userKey];
  }
  
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.status === 200) {
    const token = response.json('token');
    tokenCache[userKey] = token;
    return token;
  }
  
  return null;
}

// Cenários de teste
const scenarios = [
  {
    name: 'health_check',
    weight: 30,
    endpoint: '/api/health',
    method: 'GET'
  },
  {
    name: 'metrics',
    weight: 20,
    endpoint: '/api/metrics',
    method: 'GET'
  },
  {
    name: 'deploy_status',
    weight: 15,
    endpoint: '/api/deploy/status',
    method: 'GET'
  },
  {
    name: 'services_status',
    weight: 15,
    endpoint: '/api/services/status',
    method: 'GET'
  },
  {
    name: 'backup_list',
    weight: 10,
    endpoint: '/api/backup/list',
    method: 'GET'
  },
  {
    name: 'config_get',
    weight: 10,
    endpoint: '/api/config',
    method: 'GET'
  }
];

// Função principal do teste de stress
export default function () {
  // Selecionar usuário aleatório
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const token = getToken(user);
  
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Selecionar cenário baseado no peso
  const scenario = selectScenario();
  
  // Executar requisição
  const response = http.request(scenario.method, `${BASE_URL}${scenario.endpoint}`, null, { headers });
  
  // Verificar resposta
  const success = check(response, {
    [`${scenario.name} success`]: (r) => r.status >= 200 && r.status < 400,
    [`${scenario.name} response time`]: (r) => r.timings.duration < 5000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Sleep variável para simular comportamento real
  sleep(Math.random() * 3 + 1); // 1-4 segundos
}

// Função para selecionar cenário baseado no peso
function selectScenario() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random <= cumulative) {
      return scenario;
    }
  }
  
  return scenarios[0]; // Fallback
}

// Função de inicialização
export function setup() {
  console.log('Iniciando teste de stress...');
  
  // Verificar se a API está disponível
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`API não está disponível para teste de stress: ${response.status}`);
  }
  
  console.log('API disponível, iniciando teste de stress...');
  
  // Pre-popular cache de tokens
  for (const user of USERS) {
    getToken(user);
  }
  
  console.log('Cache de tokens populado');
}

// Função de finalização
export function teardown() {
  console.log('Teste de stress finalizado');
  
  // Limpar cache
  tokenCache = {};
}
