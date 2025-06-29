# 🚀 DevOps Platform - Glitch Edition

Uma plataforma DevOps completa rodando no Glitch.com com monitoramento, dashboard e APIs para automação.

## ✨ Features

- 🎛️ **Dashboard Interativo** - Monitoramento em tempo real
- 📊 **Métricas do Sistema** - CPU, memória, uptime
- 🔍 **Health Checks** - Verificação de saúde dos serviços
- 📋 **Logs Centralizados** - Visualização de logs em tempo real
- 🔐 **Autenticação Segura** - Login protegido por Basic Auth
- 🔄 **Auto-Restart** - Reinicialização via dashboard
- 📚 **API Documentation** - Documentação completa da API

## 🚀 Como Usar

### 1. Acesso Inicial
- Visite: `https://SEU-PROJETO.glitch.me`
- Você verá a página inicial com status do sistema

### 2. Dashboard Administrativo
- Acesse: `https://SEU-PROJETO.glitch.me/dashboard`
- Login: `admin` / `admin123` (altere no .env!)
- Dashboard completo com métricas e controles

### 3. APIs Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | 🏠 Página inicial |
| `/api/health` | GET | 🔍 Health check |
| `/api/metrics` | GET | 📊 Métricas do sistema |
| `/dashboard` | GET | 🎛️ Dashboard (auth) |
| `/logs` | GET | 📋 Logs (auth) |
| `/api/restart` | POST | 🔄 Restart (auth) |
| `/api/docs` | GET | 📚 Documentação |

## ⚙️ Configuração

### Variáveis de Ambiente

No Glitch, vá em **Tools** → **Environment** e adicione:

```env
# Credenciais (ALTERE!)
WEB_USERNAME=seu_usuario
WEB_PASSWORD=sua_senha

# Configurações
NODE_ENV=production
PROJECT_NAME=seu-projeto
LOG_LEVEL=info
```

### Personalização

1. **Alterar credenciais**:
   - Edite `WEB_USERNAME` e `WEB_PASSWORD` no .env
   - Ou use a interface do Glitch em Tools → Environment

2. **Customizar nome do projeto**:
   - Edite `PROJECT_NAME` no .env

3. **Ajustar logs**:
   - Mude `LOG_LEVEL` para debug, info, warn, ou error

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── .env              # Variáveis de ambiente
├── README.md         # Este arquivo
└── app.log           # Logs da aplicação
```

### Logs

- **Visualizar**: `https://SEU-PROJETO.glitch.me/logs`
- **Console Glitch**: Tools → Logs
- **Arquivo**: app.log (criado automaticamente)

### Monitoramento

O sistema inclui:
- ✅ Health checks automáticos
- 📊 Métricas de sistema
- 🔄 Keep-alive para Glitch
- 📋 Logs estruturados
- ⚡ Rate limiting

## 🛠️ Personalização Avançada

### Adicionar Novas Rotas

```javascript
// No server.js
app.get('/api/custom', (req, res) => {
  res.json({ message: 'Sua API customizada' });
});
```

### Middleware Personalizado

```javascript
// Exemplo de middleware personalizado
app.use('/api/admin', basicAuth, (req, res, next) => {
  // Sua lógica aqui
  next();
});
```

### Integrações Externas

```javascript
// Exemplo com APIs externas
app.get('/api/external', async (req, res) => {
  try {
    const response = await axios.get('https://api.externa.com/data');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🔒 Segurança

- 🛡️ **Helmet.js** - Headers de segurança
- 🔐 **Basic Auth** - Autenticação HTTP
- 🚦 **Rate Limiting** - Proteção contra spam
- 🍪 **Cookies Seguros** - Sessões protegidas
- 📝 **Logs de Acesso** - Auditoria completa

## 📊 Métricas Incluídas

- **Sistema**: CPU, memória, uptime
- **Node.js**: Versão, platform, arquitetura
- **Aplicação**: Porta, ambiente, versão
- **Glitch**: Projeto, domínio, IP
- **Performance**: Tempo de resposta, throughput

## 🚨 Solução de Problemas

### Problema: Site não carrega
**Solução**: Verifique se o projeto está "acordado" no Glitch

### Problema: Erro de autenticação
**Solução**: Verifique as credenciais no .env

### Problema: Logs não aparecem
**Solução**: Verifique se o arquivo app.log foi criado

### Problema: Dashboard não funciona
**Solução**: Limpe cookies e tente novamente

## 🎯 Próximos Passos

1. **Alterar credenciais padrão**
2. **Personalizar dashboard**
3. **Adicionar suas APIs**
4. **Configurar webhooks**
5. **Integrar com serviços externos**

## 🆘 Suporte

- 📚 **Documentação**: `/api/docs`
- 🔍 **Health Check**: `/api/health`
- 📊 **Status**: `/dashboard`
- 📋 **Logs**: `/logs`

---

<div align="center">

**🚀 DevOps Platform no Glitch**

*Pronto para produção em minutos!*

[![Glitch](https://img.shields.io/badge/Glitch-Ready-ff69b4)](https://glitch.com)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)

</div>
