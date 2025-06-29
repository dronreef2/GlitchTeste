// Arquivo de utilitários auxiliares para a aplicação
const crypto = require('crypto');
const validator = require('validator');

/**
 * Gera um ID único baseado em timestamp e random
 * @returns {string} ID único
 */
function generateId() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomPart}`;
}

/**
 * Formata uma data para o padrão brasileiro
 * @param {Date} date - Data para formatar
 * @returns {string} Data formatada
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) {
    return '';
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

/**
 * Valida se um email é válido
 * @param {string} email - Email para validar
 * @returns {boolean} True se válido, false caso contrário
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return validator.isEmail(email);
}

/**
 * Sanitiza entrada do usuário removendo tags HTML e caracteres perigosos
 * @param {string} input - Entrada para sanitizar
 * @returns {string} Entrada sanitizada
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove tags HTML
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove caracteres especiais perigosos
  sanitized = sanitized.replace(/[<>'"&]/g, '');
  
  return sanitized.trim();
}

/**
 * Gera hash SHA256 de uma string
 * @param {string} input - String para gerar hash
 * @returns {string} Hash SHA256
 */
function generateHash(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Gera um token aleatório seguro
 * @param {number} length - Comprimento do token (padrão: 32)
 * @returns {string} Token aleatório
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Converte bytes para formato legível
 * @param {number} bytes - Número de bytes
 * @returns {string} Formato legível (ex: 1.5 MB)
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Converte milissegundos para formato legível
 * @param {number} ms - Milissegundos
 * @returns {string} Formato legível (ex: 1h 30m 45s)
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Valida se uma string é um JSON válido
 * @param {string} str - String para validar
 * @returns {boolean} True se é JSON válido
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Faz delay por um período específico
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise} Promise que resolve após o delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry de uma função com backoff exponencial
 * @param {Function} fn - Função para executar
 * @param {number} maxRetries - Número máximo de tentativas
 * @param {number} baseDelay - Delay base em ms
 * @returns {Promise} Promise com resultado da função
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        throw error;
      }
      
      const delayTime = baseDelay * Math.pow(2, i);
      await delay(delayTime);
    }
  }
  
  throw lastError;
}

/**
 * Valida se uma URL é válida
 * @param {string} url - URL para validar
 * @returns {boolean} True se válida
 */
function isValidURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return validator.isURL(url);
}

/**
 * Extrai informações de versão de uma string
 * @param {string} version - String de versão (ex: v1.2.3, 1.2.3)
 * @returns {object} Objeto com major, minor, patch
 */
function parseVersion(version) {
  if (!version || typeof version !== 'string') {
    return null;
  }
  
  const cleanVersion = version.replace(/^v/, '');
  const parts = cleanVersion.split('.');
  
  if (parts.length !== 3) {
    return null;
  }
  
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10),
    full: cleanVersion
  };
}

/**
 * Compara duas versões
 * @param {string} version1 - Primeira versão
 * @param {string} version2 - Segunda versão
 * @returns {number} -1 se v1 < v2, 0 se iguais, 1 se v1 > v2
 */
function compareVersions(version1, version2) {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  if (!v1 || !v2) {
    return 0;
  }
  
  if (v1.major !== v2.major) {
    return v1.major > v2.major ? 1 : -1;
  }
  
  if (v1.minor !== v2.minor) {
    return v1.minor > v2.minor ? 1 : -1;
  }
  
  if (v1.patch !== v2.patch) {
    return v1.patch > v2.patch ? 1 : -1;
  }
  
  return 0;
}

/**
 * Converte objeto para query string
 * @param {object} obj - Objeto para converter
 * @returns {string} Query string
 */
function objectToQueryString(obj) {
  if (!obj || typeof obj !== 'object') {
    return '';
  }
  
  return Object.entries(obj)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Converte query string para objeto
 * @param {string} queryString - Query string
 * @returns {object} Objeto com os parâmetros
 */
function queryStringToObject(queryString) {
  if (!queryString || typeof queryString !== 'string') {
    return {};
  }
  
  const params = new URLSearchParams(queryString);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Mascarar dados sensíveis
 * @param {string} data - Dados para mascarar
 * @param {number} visibleChars - Caracteres visíveis (padrão: 4)
 * @returns {string} Dados mascarados
 */
function maskSensitiveData(data, visibleChars = 4) {
  if (!data || typeof data !== 'string') {
    return '';
  }
  
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  
  const visible = data.slice(-visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  
  return masked + visible;
}

module.exports = {
  generateId,
  formatDate,
  validateEmail,
  sanitizeInput,
  generateHash,
  generateToken,
  formatBytes,
  formatDuration,
  isValidJSON,
  delay,
  retryWithBackoff,
  isValidURL,
  parseVersion,
  compareVersions,
  objectToQueryString,
  queryStringToObject,
  maskSensitiveData
};
