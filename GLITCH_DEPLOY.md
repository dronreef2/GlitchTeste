# 📋 Guia de Publicação no Glitch.com

## 🚀 Passo a Passo para Publicar

### Opção 1: Importar do GitHub (Recomendado)

1. **Acesse o Glitch**:
   - Vá para [glitch.com](https://glitch.com)
   - Faça login ou crie uma conta

2. **Criar Novo Projeto**:
   - Clique em "New Project"
   - Selecione "Import from GitHub"

3. **Importar Repositório**:
   - Cole a URL do seu repositório GitHub
   - Aguarde a importação

4. **Configurar Variáveis**:
   - Vá em "Tools" → "Environment"
   - Adicione as variáveis do arquivo `.env`

### Opção 2: Upload Manual

1. **Preparar Arquivos**:
   - Baixe os arquivos principais:
     - `server.js`
     - `package.json`
     - `.env`
     - `README-GLITCH.md`

2. **Criar Projeto no Glitch**:
   - "New Project" → "Hello Node.js"
   - Remova arquivos padrão

3. **Upload dos Arquivos**:
   - Arraste os arquivos para o editor
   - Ou use "Tools" → "Git, Import, and Export"

### Opção 3: Remix Direto (Link Glitch)

Se você tiver um projeto público, pode criar um link de remix:

```
https://glitch.com/edit/#!/remix/seu-projeto-github
```

## ⚙️ Configuração Pós-Import

### 1. Definir Variáveis de Ambiente

No Glitch, vá em **Tools** → **Environment** e adicione:

```env
WEB_USERNAME=admin
WEB_PASSWORD=SUA_SENHA_SEGURA
NODE_ENV=production
PROJECT_NAME=seu-projeto-devops
LOG_LEVEL=info
```

### 2. Testar a Aplicação

1. **Aguarde Build**: O Glitch vai instalar dependências automaticamente
2. **Teste Inicial**: Clique em "Show" → "In a New Window"
3. **Verificar Funcionamento**: Deve aparecer a página inicial

### 3. Configurar Domínio (Opcional)

1. **Renomear Projeto**: 
   - Settings → "Change project name"
   - Escolha um nome único

2. **Domínio Personalizado** (Premium):
   - Settings → "Custom Domain"
   - Configure seu domínio

## 🔧 Estrutura de Arquivos no Glitch

```
seu-projeto/
├── server.js              # ✅ Arquivo principal
├── package.json           # ✅ Dependências
├── .env                   # ✅ Variáveis (privado)
├── README.md              # ✅ Documentação
├── app.log                # 📝 Logs (gerado automaticamente)
└── .glitch-assets/        # 📁 Assets do Glitch
```

## 🎯 URLs Importantes

Após publicar, seu projeto terá estas URLs:

- **Home**: `https://SEU-PROJETO.glitch.me/`
- **Dashboard**: `https://SEU-PROJETO.glitch.me/dashboard`
- **Health**: `https://SEU-PROJETO.glitch.me/api/health`
- **Métricas**: `https://SEU-PROJETO.glitch.me/api/metrics`
- **Logs**: `https://SEU-PROJETO.glitch.me/logs`
- **Docs**: `https://SEU-PROJETO.glitch.me/api/docs`

## ✅ Checklist de Publicação

### Antes de Publicar
- [ ] Arquivo `server.js` criado e testado
- [ ] `package.json` com dependências corretas
- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais de admin alteradas
- [ ] README atualizado

### Após Publicar
- [ ] Projeto importado com sucesso
- [ ] Dependências instaladas (check no console)
- [ ] Variáveis de ambiente adicionadas
- [ ] Página inicial carregando
- [ ] Dashboard funcionando com login
- [ ] APIs respondendo corretamente

### Testes Finais
- [ ] Acesso sem autenticação: `/` e `/api/health`
- [ ] Acesso com autenticação: `/dashboard` e `/logs`
- [ ] Funcionalidade restart funcionando
- [ ] Logs sendo gerados
- [ ] Métricas sendo coletadas

## 🛠️ Comandos Úteis no Console Glitch

```bash
# Ver logs em tempo real
tail -f app.log

# Verificar processos
ps aux

# Verificar memória
free -h

# Reiniciar aplicação
refresh

# Verificar variáveis de ambiente
env | grep -E "WEB_|NODE_|PROJECT_"
```

## 🚨 Solução de Problemas

### Erro: "Module not found"
**Solução**: Verifique se todas as dependências estão no `package.json`

### Erro: "Port already in use"
**Solução**: Use `process.env.PORT` no código (Glitch define automaticamente)

### Erro: "Cannot connect to database"
**Solução**: Remova dependências de DB se não estiver usando

### Aplicação não inicia
**Solução**: 
1. Verifique console do Glitch
2. Verifique sintaxe do `server.js`
3. Teste localmente primeiro

### Dashboard não autentica
**Solução**:
1. Verifique variáveis `WEB_USERNAME` e `WEB_PASSWORD`
2. Limpe cookies do navegador
3. Tente navegador privado

## 🎨 Personalização no Glitch

### Adicionar Assets
1. **Arrastar arquivos** para o editor
2. **Upload via interface** em "Assets"
3. **URLs automáticas** geradas pelo Glitch

### Modificar em Tempo Real
- ✅ **Auto-reload** - Mudanças aplicadas automaticamente
- ✅ **Console integrado** - Logs em tempo real
- ✅ **Editor completo** - Modificar código diretamente

### Colaboração
- 👥 **Convidar colaboradores** - Settings → "Invite"
- 🔄 **Controle de versão** - Git integrado
- 📝 **Comentários** - Colaboração em tempo real

## 📊 Monitoramento no Glitch

### Status da Aplicação
- **Uptime**: Visível no dashboard
- **Memory Usage**: Monitorado automaticamente
- **Performance**: Métricas em tempo real

### Keep-Alive
O servidor inclui keep-alive automático para evitar "hibernação":
```javascript
setInterval(() => {
  console.log('Keep-alive ping');
}, 5 * 60 * 1000); // A cada 5 minutos
```

## 🔐 Segurança no Glitch

### Boas Práticas
- ✅ **Sempre altere credenciais padrão**
- ✅ **Use HTTPS** (automático no Glitch)
- ✅ **Validação de input** implementada
- ✅ **Rate limiting** configurado
- ✅ **Headers de segurança** com Helmet

### Variáveis Sensíveis
- 🔒 **Arquivo .env** não é público
- 🔒 **Environment variables** são privadas
- 🔒 **Logs** não expõem credenciais

## 🎯 Próximos Passos

Após publicar com sucesso:

1. **Testar todas as funcionalidades**
2. **Personalizar dashboard**
3. **Adicionar suas APIs**
4. **Configurar domínio personalizado**
5. **Compartilhar com equipe**

## 📞 Suporte

- 📚 **Glitch Help**: [help.glitch.com](https://help.glitch.com)
- 💬 **Community**: [community.glitch.com](https://community.glitch.com)
- 🐛 **Issues**: Use o console do Glitch

---

<div align="center">

**🚀 Pronto para Publicar!**

*Seu projeto DevOps estará online em minutos*

</div>
