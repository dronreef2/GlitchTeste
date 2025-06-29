# ❓ Perguntas Frequentes (FAQ)

## 🚀 Instalação e Configuração

### P: Como posso gerar um UUID único?
**R:** Use um gerador online como [UUID Generator](https://www.uuidgenerator.net/) ou [ZXGJ](https://www.zxgj.cn/g/uuid). Cada instalação deve usar um UUID diferente.

### P: O que é WSPATH e como escolher um bom valor?
**R:** WSPATH é o prefixo dos caminhos WebSocket. Escolha algo único e não óbvio:
- ✅ **Bom**: `minha-empresa-2024`, `projeto-secreto`, `vpn-pessoal`
- ❌ **Ruim**: `ws`, `api`, `proxy`, `vpn`

### P: É obrigatório configurar o Argo?
**R:** Não! Sem Argo, o sistema funciona com o domínio padrão do Glitch (`seu-projeto.glitch.me`). O Argo é usado apenas para ter um domínio fixo personalizado.

### P: Posso usar qualquer domínio com Argo?
**R:** Você precisa ter o domínio registrado no CloudFlare e configurar o túnel corretamente. Não é possível usar domínios de terceiros.

---

## 🔧 Problemas Técnicos

### P: Meu projeto no Glitch "dorme" constantemente
**R:** O sistema possui keep-alive automático, mas projetos gratuitos no Glitch têm limitações. Para melhor estabilidade:
1. Use um plano pago do Glitch
2. Configure ping externo para seu domínio
3. Acesse regularmente a aplicação

### P: As configurações VPN não funcionam
**R:** Verifique:
1. UUID está correto no cliente e servidor
2. Caminhos WebSocket estão corretos (`/WSPATH-protocolo`)
3. Domínio está acessível
4. Aguarde 1-2 minutos após mudanças

### P: Como verificar se os serviços estão rodando?
**R:** Acesse estas URLs do seu projeto:
- `/status` - Lista processos ativos
- `/listen` - Mostra portas abertas
- `/list` - Exibe configurações dos clientes
- `/info` - Informações do sistema

### P: O que fazer quando recebo erro 401?
**R:** Erro 401 indica problema de autenticação:
1. Verifique `WEB_USERNAME` e `WEB_PASSWORD` no `.env`
2. Use navegador privado/incógnito
3. Limpe cache e cookies
4. Confirme que não há espaços extras nas variáveis

---

## 🌐 CloudFlare e Argo

### P: Qual a diferença entre Argo Token e JSON?
**R:** 
- **Token**: Mais simples, uma linha de texto. Recomendado para iniciantes.
- **JSON**: Mais controle, permite múltiplos domínios e configurações avançadas.

### P: Como obter um Token do Argo?
**R:** 
1. Acesse CloudFlare Dashboard
2. Vá em "Zero Trust" → "Networks" → "Tunnels"
3. Crie um novo túnel
4. Copie o token gerado
5. Configure o domínio desejado

### P: Posso usar um subdomínio gratuito?
**R:** Sim! Você pode usar serviços como:
- **Duck DNS**: `meu-vpn.duckdns.org`
- **No-IP**: `meu-vpn.ddns.net`
- Mas precisa configurá-los no CloudFlare primeiro

### P: Meu domínio Argo não funciona
**R:** Verifique:
1. Domínio está no CloudFlare
2. Token/JSON está correto
3. Aguarde até 5 minutos para propagação DNS
4. Teste com `nslookup seu-dominio.com`

---

## 🔒 Segurança e Privacidade

### P: Este projeto é seguro para uso pessoal?
**R:** Sim, mas siga boas práticas:
- Use senhas fortes
- Não compartilhe suas configurações
- Use UUID únicos
- Mantenha logs privados

### P: Meus dados ficam armazenados no Glitch?
**R:** O Glitch pode ver arquivos do projeto, mas:
- Senhas ficam em variáveis de ambiente
- Tráfego VPN é criptografado
- Use domínio próprio para mais privacidade

### P: Como tornar a configuração mais segura?
**R:**
1. Use senhas complexas (12+ caracteres)
2. Mude o WSPATH regularmente
3. Use nomes não óbvios para variáveis
4. Configure monitoramento com Nezha
5. Use domínio próprio com HTTPS

### P: Posso ser rastreado usando este proxy?
**R:** O projeto oferece proxy básico, não anonimato completo:
- ✅ Oculta tráfego do ISP local
- ✅ Muda seu IP aparente
- ❌ Não é Tor ou VPN comercial
- ❌ Logs podem existir no Glitch

---

## 📱 Clientes e Aplicativos

### P: Quais aplicativos posso usar?
**R:** Principais clientes compatíveis:
- **Windows**: V2rayN, Clash for Windows
- **Mac**: ClashX, V2rayU
- **iOS**: Shadowrocket, Quantumult X
- **Android**: V2rayNG, Clash for Android

### P: Como configurar no V2rayN?
**R:**
1. Abra V2rayN
2. Clique "Servers" → "Add VMess/VLESS server"
3. Cole a URL completa obtida em `/list`
4. Teste a conexão

### P: Configuração não funciona no Clash?
**R:** Para Clash:
1. Use as configurações YAML mostradas em `/list`
2. Adicione ao arquivo de configuração
3. Reinicie o Clash
4. Selecione o servidor na interface

### P: Posso usar no roteador?
**R:** Depende do firmware:
- **OpenWrt**: Com plugins V2ray/Xray
- **Merlin**: Com scripts personalizados
- **DD-WRT**: Limitado, pode não funcionar

---

## 🛠️ Monitoramento e Manutenção

### P: O que é a sonda Nezha?
**R:** Nezha é um sistema de monitoramento que:
- Monitora CPU, RAM, rede
- Envia alertas por email/telegram
- Mantém histórico de uptime
- É completamente opcional

### P: Como configurar WebSSH?
**R:**
1. Configure `SSH_DOMAIN` no `.env`
2. Use as mesmas credenciais (`WEB_USERNAME`/`WEB_PASSWORD`)
3. Acesse `https://ssh.seu-dominio.com`
4. Terminal Linux no navegador

### P: WebFTP é seguro para usar?
**R:** WebFTP (filebrowser) oferece:
- ✅ Upload/download de arquivos
- ✅ Autenticação por senha
- ✅ Interface amigável
- ⚠️ Use apenas para arquivos não sensíveis

### P: Como fazer backup das configurações?
**R:**
1. Copie o arquivo `.env` completo
2. Anote seus domínios Argo
3. Salve configurações dos clientes
4. Faça backup de scripts personalizados

---

## 🔄 Problemas Específicos

### P: "hello world" não aparece
**R:** Problemas possíveis:
1. Projeto ainda inicializando (aguarde 2 minutos)
2. Glitch em modo sleep (acesse novamente)
3. Erro no `server.js` (verifique logs)
4. Problema de rede (teste de outra conexão)

### P: Erro "Cannot find module"
**R:** 
1. Verifique se `package.json` está correto
2. No console do Glitch: `npm install`
3. Reinicie o projeto
4. Verifique se todas as dependências estão listadas

### P: Clientes conectam mas não há internet
**R:**
1. Verifique se Xray está rodando (`/status`)
2. Confirme roteamento no `config.json`
3. Teste DNS: `nslookup google.com`
4. Verifique configuração WARP

### P: Conexão cai constantemente
**R:**
1. Verifique estabilidade do Glitch
2. Use protocolo diferente (vless → vmess)
3. Teste com domínio direto do Glitch
4. Verifique keep-alive nos logs

---

## 📊 Performance e Limites

### P: Qual a velocidade esperada?
**R:** Depende de múltiplos fatores:
- **Glitch**: Recursos limitados
- **CloudFlare**: Boa velocidade global
- **Localização**: Distância dos servidores
- **Horário**: Tráfego da rede

### P: Quantos dispositivos posso conectar?
**R:** Tecnicamente ilimitado, mas:
- Glitch tem limites de CPU/RAM
- Performance diminui com mais conexões
- Recomendado: 3-5 dispositivos simultâneos

### P: Posso usar para streaming?
**R:** Possível, mas não ideal:
- ✅ Funciona para streaming básico
- ❌ Pode ter limitações de velocidade
- ❌ Glitch não é otimizado para mídia
- 💡 Melhor para navegação e trabalho

### P: Há limite de tráfego?
**R:** 
- **Glitch**: Não especifica limite explícito
- **CloudFlare**: 10TB/mês no plano gratuito
- **Prático**: Uso normal raramente atinge limites

---

## 🆘 Suporte e Comunidade

### P: Onde posso pedir ajuda?
**R:**
1. **Issues do GitHub**: Para bugs específicos
2. **Documentação**: Verifique todos os arquivos `.md`
3. **Logs**: Sempre inclua logs ao pedir ajuda
4. **Comunidade**: Fóruns de V2ray/Xray

### P: Como reportar um bug?
**R:**
1. Descreva o problema detalhadamente
2. Inclua logs relevantes
3. Especifique seu sistema operacional
4. Mencione qual cliente está usando
5. Informe se funcionava antes

### P: Posso contribuir com o projeto?
**R:** Sim! Contribuições são bem-vindas:
- Relatórios de bugs
- Melhorias na documentação
- Correções de código
- Novos recursos
- Traduções

---

<div align="center">

**❓ Não encontrou sua pergunta?**

*Verifique a documentação completa ou abra uma issue no GitHub*

</div>
