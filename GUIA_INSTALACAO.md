# 🚀 Guia de Instalação Completo

## 📋 Pré-requisitos

- Conta no [Glitch](https://glitch.com/) (gratuita)
- Conta no [CloudFlare](https://cloudflare.com/) (opcional, para domínio fixo)
- Editor de texto para configurar variáveis

## 🎯 Instalação Rápida (5 minutos)

### Passo 1: Criar Projeto no Glitch

#### Opção A: Fork do Projeto Original
1. Clique no botão abaixo para importar o projeto:
   
   [![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/fscarmen2/X-for-Glitch)

2. Aguarde o Glitch fazer o download dos arquivos
3. Seu projeto estará disponível em: `https://SEU-PROJETO.glitch.me`

#### Opção B: Clonar para Desenvolvimento Local
1. **Acesse seu projeto no Glitch**
2. **Vá para "Tools" → "Git, Import, and Export"**
3. **Copie a URL do Git** (exemplo):
   ```
   https://SEU-TOKEN@api.glitch.com/git/SEU-PROJETO
   ```
4. **Clone localmente**:
   ```bash
   git clone https://SEU-TOKEN@api.glitch.com/git/SEU-PROJETO
   cd SEU-PROJETO
   ```

### Passo 2: Configuração Básica

1. **Edite o arquivo `.env`**:
   ```env
   # Configuração básica (mínimo necessário)
   UUID=SEU-UUID-AQUI
   WSPATH=meupath
   WEB_USERNAME=meuusuario
   WEB_PASSWORD=minhasenha
   ```

2. **Gere um UUID**: Acesse [Gerador UUID](https://www.zxgj.cn/g/uuid) e copie o resultado

3. **Defina suas credenciais**: Substitua `meuusuario` e `minhasenha`

### Passo 3: Primeiro Acesso

1. Aguarde 1-2 minutos para o sistema inicializar
2. Acesse: `https://SEU-PROJETO.glitch.me`
3. Faça login com suas credenciais
4. Verifique se aparece "hello world"

### Passo 4: Obter Configurações dos Clientes

1. Acesse: `https://SEU-PROJETO.glitch.me/list`
2. Copie as configurações geradas
3. Importe no seu cliente VPN preferido

## ⚙️ Configuração Avançada

### CloudFlare Argo (Domínio Fixo)

#### Opção 1: Argo Token (Recomendado)

1. **Acesse CloudFlare Dashboard**
2. **Vá para "Zero Trust" → "Networks" → "Tunnels"**
3. **Clique em "Create a tunnel"**
4. **Escolha "Cloudflared"**
5. **Defina um nome para o túnel**
6. **Copie o token gerado**
7. **Adicione ao `.env`**:
   ```env
   ARGO_AUTH=SEU_TOKEN_AQUI
   ARGO_DOMAIN=seu-dominio.com
   ```

#### Opção 2: Argo JSON

1. **Use o gerador**: [CloudFlare JSON Generator](https://fscarmen.cloudflare.now.cc)
2. **Adicione ao `.env`**:
   ```env
   ARGO_AUTH='{"AccountTag":"...","TunnelID":"...","TunnelSecret":"..."}'
   ARGO_DOMAIN=seu-dominio.com
   ```

### Sonda Nezha (Monitoramento)

Se você tem um servidor Nezha:

```env
NEZHA_SERVER=seu-servidor.com
NEZHA_PORT=5555
NEZHA_KEY=sua-chave-aqui
NEZHA_TLS=1
```

### WebSSH e WebFTP

Para acesso remoto via navegador:

```env
SSH_DOMAIN=ssh.seu-dominio.com
FTP_DOMAIN=ftp.seu-dominio.com
```

## 🔧 Configuração Completa do `.env`

```env
# ===== BÁSICO =====
UUID=de04add9-5c68-8bab-950c-08cd5320df18
WSPATH=glitch

# ===== AUTENTICAÇÃO WEB =====
WEB_USERNAME=admin
WEB_PASSWORD=senha123

# ===== CLOUDFLARE ARGO =====
ARGO_AUTH=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ARGO_DOMAIN=vpn.meudominio.com

# ===== NEZHA (OPCIONAL) =====
NEZHA_SERVER=monitor.meudominio.com
NEZHA_PORT=5555
NEZHA_KEY=minha_chave_nezha
NEZHA_TLS=1

# ===== WEBSSH/WEBFTP (OPCIONAL) =====
SSH_DOMAIN=ssh.meudominio.com
FTP_DOMAIN=ftp.meudominio.com
```

## 📱 Configuração dos Clientes

### V2rayN (Windows)

1. **Abra V2rayN**
2. **Clique em "Servers" → "Add VMess server"**
3. **Cole a URL `vmess://...`**
4. **Teste a conexão**

### Clash (Multi-plataforma)

1. **Abra Clash**
2. **Vá para "Profiles"**
3. **Adicione as configurações YAML**
4. **Selecione o servidor Argo**

### Shadowrocket (iOS)

1. **Abra Shadowrocket**
2. **Toque no "+"**
3. **Cole a URL `vless://...`**
4. **Ative a conexão**

## 🔍 Verificação da Instalação

### Checklist de Funcionamento

- [ ] Projeto deployado no Glitch
- [ ] Arquivo `.env` configurado
- [ ] Login web funcional (`/`)
- [ ] Configurações disponíveis (`/list`)
- [ ] Processos ativos (`/status`)
- [ ] Portas abertas (`/listen`)

### Testes de Conectividade

1. **Teste básico**:
   ```bash
   curl -I https://SEU-PROJETO.glitch.me
   ```

2. **Teste com autenticação**:
   ```bash
   curl -u usuario:senha https://SEU-PROJETO.glitch.me/list
   ```

3. **Teste WebSocket**:
   Use um cliente VPN com as configurações obtidas

## 🚨 Solução de Problemas

### Problema: "hello world" não aparece

**Solução**:
1. Verifique se o projeto está "desperto" no Glitch
2. Aguarde 1-2 minutos para inicialização
3. Verifique logs no console do Glitch

### Problema: Erro de autenticação

**Solução**:
1. Confirme `WEB_USERNAME` e `WEB_PASSWORD` no `.env`
2. Use navegador privado para testar
3. Limpe cache/cookies

### Problema: Configurações não aparecem em `/list`

**Solução**:
1. Verifique se `ARGO_AUTH` está correto
2. Aguarde 30 segundos para Argo inicializar
3. Verifique status em `/status`

### Problema: Cliente VPN não conecta

**Solução**:
1. Confirme UUID no `.env` e cliente
2. Verifique caminhos WebSocket
3. Teste com diferentes protocolos

### Problema: Não consigo acessar o repositório Git

**Sintomas:**
- `git clone` falha com erro de autenticação
- "Permission denied" ao fazer push
- Token inválido

**Soluções:**
1. **Verificar token no Glitch**:
   - Vá para "Tools" → "Git, Import, and Export"
   - Copie a URL completa novamente
   - Token pode ter expirado

2. **Limpar cache Git**:
   ```bash
   git config --global --unset credential.helper
   git config --global credential.helper store
   ```

3. **Testar conectividade**:
   ```bash
   curl -I https://api.glitch.com/git/SEU-PROJETO
   ```

### Problema: Sincronização falha

**Sintomas:**
- Push rejeitado
- Conflitos de merge
- Branches divergentes

**Soluções:**
1. **Force push (cuidado!)**:
   ```bash
   git push origin main --force
   ```

2. **Resolver conflitos**:
   ```bash
   git pull origin main
   # Resolver conflitos manualmente
   git add .
   git commit -m "Resolver conflitos"
   git push origin main
   ```

3. **Reset para remote**:
   ```bash
   git fetch origin
   git reset --hard origin/main
   ```

### Problema: Projeto não atualiza no Glitch

**Sintomas:**
- Push bem-sucedido mas mudanças não aparecem
- Glitch mostra versão antiga
- Rebuild não funciona

**Soluções:**
1. **Refresh forçado**:
   - Ctrl+Shift+R no editor Glitch
   - Ou feche e reabra o projeto

2. **Verificar logs**:
   - "Tools" → "Logs"
   - Procurar por erros de build

3. **Rebuild manual**:
   - "Tools" → "Console"
   - `refresh` comando

### Problema: Token comprometido

**Sintomas:**
- Acesso não autorizado
- Pushes não autorizados
- Segurança comprometida

**Soluções:**
1. **Regenerar token**:
   - Vá para configurações do Glitch
   - Regenere o token Git
   - Atualize todas as referências

2. **Atualizar repositórios**:
   ```bash
   git remote set-url origin https://NOVO-TOKEN@api.glitch.com/git/SEU-PROJETO
   ```

3. **Verificar logs de acesso**:
   - Monitore atividade suspeita
   - Revise commits recentes

## 📚 Recursos Adicionais

### Documentação Oficial

- [Glitch Help](https://help.glitch.com/)
- [Git Documentation](https://git-scm.com/docs)
- [GitHub Actions](https://docs.github.com/actions)

### Comunidade

- [Glitch Community](https://community.glitch.com/)
- [Stack Overflow - Glitch](https://stackoverflow.com/questions/tagged/glitch)
- [Discord Glitch](https://discord.gg/glitch)

### Ferramentas Úteis

- [Glitch Status](https://status.glitch.com/) - Status dos serviços
- [Git Visualizer](https://git-school.github.io/visualizing-git/) - Visualizar Git
- [UUID Generator](https://www.zxgj.cn/g/uuid) - Gerar UUIDs

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. **Configure domínio personalizado** (CloudFlare)
2. **Implemente monitoramento** (Nezha)
3. **Configure backup automático** (GitHub)
4. **Otimize performance** (CDN)
5. **Adicione alertas** (Discord/Slack)
6. **Documente configurações** (README)

## ✅ Checklist Final

### Instalação Básica
- [ ] Projeto importado no Glitch
- [ ] Arquivo `.env` configurado
- [ ] UUID gerado e definido
- [ ] Credenciais web configuradas
- [ ] Primeiro acesso funcionando

### Git e Versionamento
- [ ] Repositório Git acessível
- [ ] Token do Glitch obtido
- [ ] Clone local funcionando
- [ ] Backup no GitHub configurado
- [ ] Sincronização automática ativa

### Configuração Avançada
- [ ] CloudFlare Argo configurado
- [ ] Domínio personalizado funcionando
- [ ] Monitoramento Nezha ativo
- [ ] WebSSH/FTP configurado
- [ ] Alertas implementados

### Testes e Validação
- [ ] Conexão VPN testada
- [ ] Múltiplos clientes testados
- [ ] Performance verificada
- [ ] Logs monitorados
- [ ] Backup testado
