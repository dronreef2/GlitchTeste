#!/bin/bash

# 🚀 Script de Deploy para GitHub + Glitch
# Este script automatiza o processo de upload para GitHub

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploy para GitHub + Glitch${NC}"
echo "=================================="

# Verificar se estamos no diretório correto
if [ ! -f "server.js" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório glitch-deploy/${NC}"
    exit 1
fi

# Solicitar URL do repositório GitHub
echo -e "${YELLOW}📝 Digite a URL do seu repositório GitHub:${NC}"
echo "Exemplo: https://github.com/seuusuario/glitch-devops-project.git"
read -p "URL do GitHub: " GITHUB_URL

if [ -z "$GITHUB_URL" ]; then
    echo -e "${RED}❌ URL do GitHub é obrigatória!${NC}"
    exit 1
fi

# Verificar se já existe remote
if git remote get-url origin 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Remote 'origin' já existe. Removendo...${NC}"
    git remote remove origin
fi

echo -e "${BLUE}🔗 Adicionando remote GitHub...${NC}"
git remote add origin "$GITHUB_URL"

echo -e "${BLUE}📦 Fazendo commit final...${NC}"
git add .
git commit -m "Deploy ready for Glitch - $(date '+%Y-%m-%d %H:%M:%S')" || echo "Nada para commitar"

echo -e "${BLUE}🚀 Fazendo push para GitHub...${NC}"
git push -u origin main

# Extrair nome do repositório da URL
REPO_NAME=$(basename "$GITHUB_URL" .git)
REPO_OWNER=$(echo "$GITHUB_URL" | sed -n 's/.*github\.com[\/:]([^\/]*)[\/]([^\/]*).*/\1/p' | cut -d'/' -f1)

echo ""
echo -e "${GREEN}✅ Sucesso! Projeto enviado para GitHub${NC}"
echo "=================================="
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo ""
echo -e "${YELLOW}1. Deploy via Import GitHub:${NC}"
echo "   • Acesse: https://glitch.com/create"
echo "   • Escolha: 'Import from GitHub'"
echo "   • Cole: $GITHUB_URL"
echo ""
echo -e "${YELLOW}2. Ou use o Remix direto:${NC}"
echo "   • Abra o arquivo deploy.html no navegador"
echo "   • Clique no botão de Remix"
echo ""
echo -e "${YELLOW}3. Configurar Variáveis de Ambiente no Glitch:${NC}"
echo "   • WEB_USERNAME=admin"
echo "   • WEB_PASSWORD=suasenhasegura123"
echo "   • PROJECT_NAME=devops-glitch"
echo "   • NODE_ENV=production"
echo ""
echo -e "${YELLOW}4. URLs do seu projeto (após deploy):${NC}"
echo "   • Home: https://SEU-PROJETO.glitch.me/"
echo "   • Dashboard: https://SEU-PROJETO.glitch.me/dashboard"
echo "   • API: https://SEU-PROJETO.glitch.me/api/health"
echo ""
echo -e "${GREEN}🎉 Seu projeto DevOps está pronto para o Glitch!${NC}"

# Abrir URLs úteis
echo ""
echo -e "${BLUE}🌐 Abrindo links úteis...${NC}"
echo "GitHub: $GITHUB_URL"
echo "Glitch Create: https://glitch.com/create"

# Criar um arquivo com as instruções
cat > DEPLOY_SUCCESS.md << EOF
# ✅ Deploy Realizado com Sucesso!

## 📋 Informações do Deploy

- **Data**: $(date '+%Y-%m-%d %H:%M:%S')
- **GitHub**: $GITHUB_URL
- **Status**: Enviado com sucesso

## 🚀 Próximos Passos

### 1. Deploy no Glitch
- Acesse: https://glitch.com/create
- Escolha: "Import from GitHub"
- URL: $GITHUB_URL

### 2. Configurar Variáveis de Ambiente
\`\`\`env
WEB_USERNAME=admin
WEB_PASSWORD=suasenhasegura123
PROJECT_NAME=devops-glitch
NODE_ENV=production
\`\`\`

### 3. Testar URLs
- Home: https://SEU-PROJETO.glitch.me/
- Dashboard: https://SEU-PROJETO.glitch.me/dashboard
- API: https://SEU-PROJETO.glitch.me/api/health

## 🔧 Links Úteis
- GitHub: $GITHUB_URL
- Glitch: https://glitch.com/create
- Documentação: GLITCH_DEPLOY.md
EOF

echo -e "${GREEN}📄 Instruções salvas em: DEPLOY_SUCCESS.md${NC}"
