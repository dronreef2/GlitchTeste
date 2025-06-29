# ⚙️ Exemplos de Configuração

Este arquivo contém exemplos práticos de configuração para diferentes cenários de uso do Xray no Glitch.

## 🏃‍♂️ Configuração Rápida (Iniciantes)

### Cenário: Uso pessoal básico
```env
# Configuração mínima para começar
UUID=de04add9-5c68-8bab-950c-08cd5320df18
WSPATH=minhavpn
WEB_USERNAME=admin
WEB_PASSWORD=minhasenha123
```

**Características**:
- ✅ Funciona imediatamente
- ✅ Domínio temporário do Glitch
- ✅ Todos os protocolos disponíveis
- ❌ Domínio muda a cada restart

---

## 🌟 Configuração Intermediária

### Cenário: Uso regular com domínio fixo
```env
# Configuração com Argo Token
UUID=550e8400-e29b-41d4-a716-446655440000
WSPATH=secure
WEB_USERNAME=usuario
WEB_PASSWORD=SenhaSegura456!

# CloudFlare Argo
ARGO_AUTH=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJjbG91ZGZsYXJlIiwiZXhwIjoxNjk...
ARGO_DOMAIN=vpn.meusite.com
```

**Características**:
- ✅ Domínio fixo personalizado
- ✅ Melhor estabilidade
- ✅ Configuração persistente
- ✅ Ideal para uso diário

---

## 🔧 Configuração Profissional

### Cenário: Uso empresarial com monitoramento completo
```env
# Configuração empresarial
UUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8
WSPATH=empresa-vpn

# Credenciais seguras
WEB_USERNAME=admin-corp
WEB_PASSWORD=C0rp0r@t3P@ssw0rd2024!

# CloudFlare Argo com JSON
ARGO_AUTH='{"AccountTag":"abc123def456","TunnelID":"tunnel-id-here","TunnelSecret":"secret-key-here"}'
ARGO_DOMAIN=vpn.empresa.com

# Monitoramento Nezha
NEZHA_SERVER=monitor.empresa.com
NEZHA_PORT=5555
NEZHA_KEY=chave-secreta-nezha-2024
NEZHA_TLS=1

# Serviços web adicionais
SSH_DOMAIN=ssh.empresa.com
FTP_DOMAIN=files.empresa.com
```

**Características**:
- ✅ Monitoramento completo
- ✅ WebSSH para administração
- ✅ WebFTP para transferências
- ✅ Configuração robusta
- ✅ Domínios organizados

---

## 🏠 Configuração Doméstica

### Cenário: Família/casa com múltiplos dispositivos
```env
# Configuração familiar
UUID=123e4567-e89b-12d3-a456-426614174000
WSPATH=casa-familia

# Credenciais familiares
WEB_USERNAME=familia
WEB_PASSWORD=CasaSegura2024

# Argo simples
ARGO_AUTH=token-argo-da-familia-aqui
ARGO_DOMAIN=casa.minharede.com

# Monitoramento básico
NEZHA_SERVER=192.168.1.100
NEZHA_PORT=5555
NEZHA_KEY=chave-monitor-casa
```

**Características**:
- ✅ Fácil de usar por toda família
- ✅ Monitoramento local
- ✅ Configuração simples
- ✅ Domínio personalizado

---

## 🎓 Configuração Educacional

### Cenário: Uso em ambiente educacional/laboratório
```env
# Configuração para estudos
UUID=98765432-1234-5678-9abc-def012345678
WSPATH=lab-estudo

# Credenciais do laboratório
WEB_USERNAME=professor
WEB_PASSWORD=Lab0rat0ri0@2024

# Sem Argo (usando domínio Glitch)
# ARGO_AUTH=
# ARGO_DOMAIN=

# Sem monitoramento adicional
# NEZHA_SERVER=
# NEZHA_PORT=
# NEZHA_KEY=
```

**Características**:
- ✅ Configuração simples para aprendizado
- ✅ Sem dependências externas
- ✅ Fácil de replicar
- ✅ Ideal para testes

---

## 🔒 Configuração de Alta Segurança

### Cenário: Uso com máxima segurança
```env
# Configuração ultra-segura
UUID=f47ac10b-58cc-4372-a567-0e02b2c3d479
WSPATH=ultra-secure-path-2024

# Credenciais complexas
WEB_USERNAME=sec-admin-2024
WEB_PASSWORD=Ul7r@S3cur3P@ssw0rd!@#2024

# Argo com configuração completa
ARGO_AUTH='{"AccountTag":"security-tag","TunnelID":"secure-tunnel-001","TunnelSecret":"maximum-security-secret-key"}'
ARGO_DOMAIN=secure.privacy-first.net

# Monitoramento dedicado
NEZHA_SERVER=secure-monitor.privacy-first.net
NEZHA_PORT=443
NEZHA_KEY=ultra-secure-nezha-key-2024
NEZHA_TLS=1

# Acesso administrativo
SSH_DOMAIN=admin.privacy-first.net
FTP_DOMAIN=secure-files.privacy-first.net
```

**Características**:
- ✅ Senhas ultra-complexas
- ✅ Nomes de caminhos únicos
- ✅ Monitoramento com TLS
- ✅ Domínios dedicados de segurança

---

## 🌍 Configuração Multi-Região

### Cenário: Serviço distribuído globalmente
```env
# Configuração global
UUID=region-us-east-550e8400-e29b
WSPATH=global-us-east

# Credenciais regionais
WEB_USERNAME=global-admin
WEB_PASSWORD=Gl0b@lN3tw0rk2024!

# Argo região específica
ARGO_AUTH=token-us-east-region-specific
ARGO_DOMAIN=us-east.global-vpn.net

# Monitoramento central
NEZHA_SERVER=monitor.global-vpn.net
NEZHA_PORT=5555
NEZHA_KEY=global-monitor-key-us-east
NEZHA_TLS=1
```

**Características**:
- ✅ Identificação por região
- ✅ Monitoramento centralizado
- ✅ Domínios organizados por região
- ✅ Escalabilidade

---

## 🧪 Configuração de Desenvolvimento

### Cenário: Testes e desenvolvimento
```env
# Configuração de desenvolvimento
UUID=dev-test-12345678-1234-5678
WSPATH=dev-testing

# Credenciais de desenvolvimento
WEB_USERNAME=developer
WEB_PASSWORD=DevPassword123

# Argo de teste (opcional)
ARGO_AUTH=dev-testing-token-here
ARGO_DOMAIN=dev-test.meudominio.com

# Debug habilitado
# NEZHA_SERVER=dev-monitor.local
# NEZHA_PORT=5555
# NEZHA_KEY=dev-key-testing
```

**Características**:
- ✅ Fácil identificação como ambiente de teste
- ✅ Configuração flexível
- ✅ Permite experimentação
- ✅ Sem produção crítica

---

## 📋 Templates por Categoria

### 🔹 Mínimo Funcional
```env
UUID=SEU-UUID-AQUI
WEB_USERNAME=admin
WEB_PASSWORD=senha123
```

### 🔹 Com Domínio Próprio
```env
UUID=SEU-UUID-AQUI
WSPATH=seucaminho
WEB_USERNAME=usuario
WEB_PASSWORD=suasenha
ARGO_AUTH=SEU-TOKEN-ARGO
ARGO_DOMAIN=seu.dominio.com
```

### 🔹 Monitoramento Completo
```env
UUID=SEU-UUID-AQUI
WSPATH=monitor
WEB_USERNAME=admin
WEB_PASSWORD=senhaadmin
ARGO_AUTH=TOKEN-ARGO
ARGO_DOMAIN=vpn.dominio.com
NEZHA_SERVER=monitor.dominio.com
NEZHA_PORT=5555
NEZHA_KEY=chave-nezha
NEZHA_TLS=1
```

### 🔹 Acesso Web Completo
```env
UUID=SEU-UUID-AQUI
WSPATH=webapp
WEB_USERNAME=webadmin
WEB_PASSWORD=websenha
ARGO_AUTH=TOKEN-ARGO
ARGO_DOMAIN=main.dominio.com
SSH_DOMAIN=ssh.dominio.com
FTP_DOMAIN=files.dominio.com
```

---

## 🔧 Dicas de Configuração

### UUIDs Únicos
- Use geradores online: [uuidgenerator.net](https://www.uuidgenerator.net/)
- Cada instância deve ter UUID único
- Evite UUIDs sequenciais

### Caminhos WebSocket
- Use nomes únicos e imprevisíveis
- Evite palavras comuns como "ws", "api", "proxy"
- Combine letras, números e hífens

### Senhas Seguras
- Mínimo 12 caracteres
- Combine maiúsculas, minúsculas, números e símbolos
- Evite palavras do dicionário
- Use geradores de senha

### Domínios
- Use subdomínios organizados
- Considere SSL/TLS sempre ativo
- Teste resolução DNS antes de usar

---

<div align="center">

**⚙️ Configurações Prontas para Usar**

*Escolha o template que melhor se adequa ao seu caso de uso*

</div>
