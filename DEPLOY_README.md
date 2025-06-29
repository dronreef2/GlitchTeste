# 🚀 Deploy no Glitch - Guia Completo

Este é o diretório de deploy otimizado para o **Glitch.com**. Todos os arquivos aqui estão prontos para publicação.

## 📦 Conteúdo do Deploy

```
glitch-deploy/
├── server.js          # Servidor principal
├── package.json       # Dependências otimizadas para Glitch
├── .env               # Variáveis de ambiente base
├── .env.example       # Template de variáveis
├── .env.production    # Configuração para produção
├── README.md          # Este arquivo
├── GLITCH_DEPLOY.md   # Documentação do deploy
├── INSTRUCTIONS.md    # Instruções específicas
├── deploy.html        # Interface de deploy
├── auto-deploy.sh     # Script automatizado
└── github-deploy.sh   # Script para GitHub
```

## 🎯 Opções de Deploy

### 1. 🚀 Deploy Automático (Recomendado)
```bash
./auto-deploy.sh
```

### 2. 📦 Deploy via GitHub
```bash
./github-deploy.sh
```

### 3. 🌐 Deploy Manual
1. Acesse [Glitch.com/create](https://glitch.com/create)
2. Escolha "Hello Express"
3. Substitua todos os arquivos
4. Configure variáveis de ambiente

## ⚙️ Configuração no Glitch

### Variáveis de Ambiente Obrigatórias
No painel do Glitch (Tools → Environment):

```env
WEB_USERNAME=admin
WEB_PASSWORD=SuaSenhaSegura123!
NODE_ENV=production
PROJECT_NAME=seu-projeto
```

### Variáveis Opcionais
```env
LOG_LEVEL=info
METRICS_ENABLED=true
THEME_COLOR=#667eea
SESSION_SECRET=sua-chave-secreta-longa
```

## 🔗 URLs do Projeto

Após o deploy, seu projeto terá:

| Endpoint | URL | Descrição |
|----------|-----|-----------|
| Home | `https://SEU-PROJETO.glitch.me/` | Página principal |
| Dashboard | `https://SEU-PROJETO.glitch.me/dashboard` | Painel administrativo |
| API Health | `https://SEU-PROJETO.glitch.me/api/health` | Status da API |
| Métricas | `https://SEU-PROJETO.glitch.me/api/metrics` | Métricas do sistema |
| Logs | `https://SEU-PROJETO.glitch.me/logs` | Visualizar logs |
| Documentação | `https://SEU-PROJETO.glitch.me/api/docs` | Documentação da API |

## ✅ Checklist de Validação

Após o deploy, verifique:

- [ ] ✅ Projeto importado com sucesso
- [ ] ⚙️ Variáveis de ambiente configuradas
- [ ] 🔐 Credenciais alteradas (não usar admin/admin)
- [ ] 🏠 Página inicial carregando
- [ ] 📊 Dashboard acessível com login
- [ ] 🔍 APIs respondendo (/api/health)
- [ ] 📋 Logs funcionando
- [ ] 📈 Métricas sendo coletadas
- [ ] 🔄 Função restart operacional

## 🛠️ Troubleshooting

### Projeto não inicia
- Verifique se `package.json` tem `"start": "node server.js"`
- Confirme as variáveis de ambiente
- Veja os logs no console do Glitch

### Dashboard não carrega
- Verifique `WEB_USERNAME` e `WEB_PASSWORD`
- Teste o login com as credenciais configuradas
- Confirme se `ENABLE_DASHBOARD=true`

### API não responde
- Teste: `https://seu-projeto.glitch.me/api/health`
- Verifique logs de erro no console
- Confirme se a porta está correta (3000)

### Erro 503 (Service Unavailable)
- Projeto pode estar "dormindo"
- Acesse qualquer URL para "acordar"
- Configure ping automático se necessário

## 📱 Comandos Úteis

### No Terminal do Glitch
```bash
# Ver logs em tempo real
npm run logs

# Reiniciar aplicação
npm run restart

# Verificar saúde
npm run health

# Ver informações do sistema
node -e "console.log(process.env)"
```

### Comandos Git no Glitch
```bash
# Sincronizar com GitHub
git remote add github https://github.com/usuario/repo.git
git pull github main
git push github main
```

## 🔧 Personalização

### Alterar Tema
No arquivo `.env`:
```env
THEME_COLOR=#sua-cor
COMPANY_NAME=Sua Empresa
```

### Adicionar Integrações
```env
WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK=https://discord.com/api/...
```

### Configurar Database
```env
DATABASE_URL=sqlite:/.data/sqlite.db
```

## 🎉 Pronto!

Seu projeto DevOps estará online e funcional no Glitch em poucos minutos!

### Links Úteis
- 🌐 [Glitch.com](https://glitch.com/)
- 📚 [Glitch Help](https://help.glitch.com/)
- 🐙 [GitHub](https://github.com/)
- 📖 [Documentação Node.js](https://nodejs.org/docs/)

---

**Desenvolvido com ❤️ para funcionar perfeitamente no Glitch.com**
