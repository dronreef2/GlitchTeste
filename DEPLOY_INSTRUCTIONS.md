# 🚀 Instruções de Deploy para Glitch

## 📋 Passos para Deploy

### 1. Subir para GitHub
```bash
# Adicionar remote do GitHub (substitua pela sua URL)
git remote add origin https://github.com/SEU_USUARIO/glitch-devops-project.git

# Fazer push
git push -u origin main
```

### 2. Deploy no Glitch via GitHub

1. **Acesse**: https://glitch.com/create
2. **Escolha**: "Import from GitHub"
3. **Cole a URL**: https://github.com/SEU_USUARIO/glitch-devops-project
4. **Aguarde** o import ser concluído

### 3. Deploy Manual (Alternativa)

Se preferir upload manual:
1. **Acesse**: https://glitch.com/create
2. **Escolha**: "Hello Express"
3. **Substitua** todos os arquivos pelos do diretório `glitch-deploy/`

### 4. Configurar Variáveis de Ambiente

No painel do Glitch:
1. Clique em **"Tools"** → **"Environment"**
2. Adicione as variáveis do arquivo `.env.example`:

```env
WEB_USERNAME=admin
WEB_PASSWORD=suasenhasegura123
PROJECT_NAME=devops-glitch
NODE_ENV=production
PORT=3000
GLITCH_APP_NAME=seu-projeto-glitch
```

### 5. Testar o Projeto

Após o deploy:
- **Home**: `https://seu-projeto.glitch.me/`
- **Dashboard**: `https://seu-projeto.glitch.me/dashboard`
- **API Health**: `https://seu-projeto.glitch.me/api/health`
- **Logs**: `https://seu-projeto.glitch.me/logs`

### 6. URLs Importantes

- **Editor Glitch**: `https://glitch.com/edit/#!/seu-projeto`
- **Logs Console**: `https://glitch.com/edit/#!/seu-projeto?path=.env`
- **Configurações**: Tools → Environment no editor

## 🔧 Troubleshooting

### Projeto não inicia
- Verifique as variáveis de ambiente
- Veja os logs no console do Glitch
- Confirme que o `package.json` tem `"start": "node server.js"`

### Dashboard não carrega
- Verifique `WEB_USERNAME` e `WEB_PASSWORD` nas variáveis de ambiente
- Teste o login com as credenciais configuradas

### API não responde
- Verifique se o servidor está rodando em `https://seu-projeto.glitch.me/api/health`
- Confirme se não há erros no console

## 📱 Remix Rápido

Para fazer remix direto:
1. Abra: `https://glitch.com/edit/#!/remix/glitch-devops-starter`
2. Ou use o botão no arquivo `deploy.html`

## 🔄 Sincronização GitHub ↔ Glitch

### Import do GitHub
```bash
# No terminal do Glitch
git remote add github https://github.com/SEU_USUARIO/glitch-devops-project.git
git pull github main
```

### Export para GitHub
```bash
# No terminal do Glitch
git push github main
```

## 🎯 Próximos Passos

1. **Personalizar** o domínio (se tiver conta Pro)
2. **Configurar** webhooks para auto-deploy
3. **Adicionar** integrações (Discord, Slack, etc.)
4. **Monitorar** logs e métricas
5. **Escalar** conforme necessário

---

**🎉 Seu projeto DevOps está pronto para rodar no Glitch!**
