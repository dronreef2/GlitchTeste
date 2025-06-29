#!/bin/bash

# 🚀 Deploy Completo para Glitch - Script Automatizado
# Este script faz todo o processo de deploy automaticamente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art
echo -e "${PURPLE}"
cat << "EOF"
 ____  _____ _   _ ____  _____ ____  
/ ___||  ___| \ | |  _ \| ____|  _ \ 
\___ \| |_  |  \| | | | |  _| | |_) |
 ___) |  _| | |\  | |_| | |___|  _ < 
|____/|_|   |_| \_|____/|_____|_| \_\
                                    
   ____  _____ _   _ ____  ____      
  / ___|| ____| \ | |  _ \|  _ \     
  \___ \|  _| |  \| | | | | |_) |    
   ___) | |___| |\  | |_| |  _ <     
  |____/|_____|_| \_|____/|_| \_\    
                                    
    GLITCH DEPLOY AUTOMÁTICO         
EOF
echo -e "${NC}"

echo -e "${BLUE}🚀 Deploy Automático para Glitch${NC}"
echo "================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "server.js" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório glitch-deploy/${NC}"
    echo "Comando: cd glitch-deploy && ./auto-deploy.sh"
    exit 1
fi

# Menu de opções
echo -e "${CYAN}📋 Escolha uma opção de deploy:${NC}"
echo "1) 🚀 Deploy via GitHub (Recomendado)"
echo "2) 📦 Preparar ZIP para upload manual"
echo "3) 🌐 Apenas abrir links úteis"
echo "4) ⚙️  Gerar comandos Git personalizados"
echo ""
read -p "Digite sua escolha (1-4): " CHOICE

case $CHOICE in
    1)
        echo -e "${BLUE}🔗 Deploy via GitHub${NC}"
        echo "====================="
        echo ""
        
        # Verificar se Git está configurado
        if ! git config user.name >/dev/null 2>&1; then
            echo -e "${YELLOW}⚙️  Configurando Git...${NC}"
            read -p "Seu nome: " GIT_NAME
            read -p "Seu email: " GIT_EMAIL
            git config user.name "$GIT_NAME"
            git config user.email "$GIT_EMAIL"
        fi
        
        # Solicitar URL do GitHub
        echo -e "${YELLOW}📝 Cole a URL do seu repositório GitHub:${NC}"
        echo "Exemplo: https://github.com/seuusuario/meu-projeto-glitch.git"
        read -p "URL: " GITHUB_URL
        
        if [ -z "$GITHUB_URL" ]; then
            echo -e "${RED}❌ URL é obrigatória!${NC}"
            exit 1
        fi
        
        # Configurar remote
        if git remote get-url origin 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Atualizando remote...${NC}"
            git remote set-url origin "$GITHUB_URL"
        else
            git remote add origin "$GITHUB_URL"
        fi
        
        # Commit e push
        echo -e "${BLUE}📦 Preparando commit...${NC}"
        git add .
        git commit -m "🚀 Deploy ready for Glitch - $(date '+%Y-%m-%d %H:%M:%S')" || echo "Nada para commitar"
        
        echo -e "${BLUE}⬆️  Enviando para GitHub...${NC}"
        git push -u origin main
        
        # Extrair informações do repo
        REPO_NAME=$(basename "$GITHUB_URL" .git)
        
        echo ""
        echo -e "${GREEN}✅ Sucesso! Projeto no GitHub${NC}"
        echo "============================="
        echo ""
        echo -e "${YELLOW}🎯 Próximo passo - Deploy no Glitch:${NC}"
        echo "1. Acesse: https://glitch.com/create"
        echo "2. Clique em 'Import from GitHub'"
        echo "3. Cole: $GITHUB_URL"
        echo "4. Aguarde a importação"
        echo ""
        echo -e "${YELLOW}⚙️  Configurar no Glitch (Tools → Environment):${NC}"
        echo "WEB_USERNAME=admin"
        echo "WEB_PASSWORD=suasenhasegura123"
        echo "NODE_ENV=production"
        echo "PROJECT_NAME=$REPO_NAME"
        
        # Abrir URLs
        if command -v xdg-open > /dev/null; then
            echo -e "${BLUE}🌐 Abrindo Glitch...${NC}"
            xdg-open "https://glitch.com/create" 2>/dev/null &
        fi
        ;;
        
    2)
        echo -e "${BLUE}📦 Preparando ZIP para upload manual${NC}"
        echo "====================================="
        
        # Criar ZIP otimizado
        ZIP_NAME="glitch-deploy-$(date '+%Y%m%d-%H%M%S').zip"
        
        echo -e "${YELLOW}📦 Criando arquivo ZIP...${NC}"
        zip -r "../$ZIP_NAME" . \
            -x "*.git*" "*.sh" "DEPLOY_*" "*.md" "node_modules/*" \
            2>/dev/null || echo "Aviso: zip não encontrado, usando tar"
        
        if [ ! -f "../$ZIP_NAME" ]; then
            echo -e "${YELLOW}📦 Criando arquivo TAR...${NC}"
            tar -czf "../glitch-deploy-$(date '+%Y%m%d-%H%M%S').tar.gz" \
                --exclude=".git*" --exclude="*.sh" --exclude="DEPLOY_*" \
                --exclude="*.md" --exclude="node_modules" .
        fi
        
        echo ""
        echo -e "${GREEN}✅ Arquivo criado com sucesso!${NC}"
        echo -e "${YELLOW}📋 Instruções para upload manual:${NC}"
        echo "1. Acesse: https://glitch.com/create"
        echo "2. Escolha: 'Hello Express'"
        echo "3. Delete todos os arquivos padrão"
        echo "4. Upload do arquivo ZIP criado"
        echo "5. Configure as variáveis de ambiente"
        ;;
        
    3)
        echo -e "${BLUE}🌐 Links Úteis para Deploy${NC}"
        echo "=========================="
        echo ""
        echo -e "${YELLOW}🚀 Glitch:${NC}"
        echo "• Criar projeto: https://glitch.com/create"
        echo "• Import GitHub: https://glitch.com/create#github"
        echo "• Comunidade: https://glitch.com/community"
        echo ""
        echo -e "${YELLOW}📦 GitHub:${NC}"
        echo "• Novo repositório: https://github.com/new"
        echo "• Import repositório: https://github.com/new/import"
        echo ""
        echo -e "${YELLOW}📚 Documentação:${NC}"
        echo "• Glitch Help: https://help.glitch.com/"
        echo "• Node.js: https://nodejs.org/docs/"
        echo "• Express: https://expressjs.com/"
        
        # Tentar abrir links
        if command -v xdg-open > /dev/null; then
            echo -e "${BLUE}🌐 Abrindo links...${NC}"
            xdg-open "https://glitch.com/create" 2>/dev/null &
            sleep 1
            xdg-open "https://github.com/new" 2>/dev/null &
        fi
        ;;
        
    4)
        echo -e "${BLUE}⚙️  Comandos Git Personalizados${NC}"
        echo "==============================="
        
        read -p "Nome do seu projeto: " PROJECT_NAME
        read -p "Seu usuário GitHub: " GITHUB_USER
        
        if [ -z "$PROJECT_NAME" ] || [ -z "$GITHUB_USER" ]; then
            PROJECT_NAME="meu-projeto-glitch"
            GITHUB_USER="seuusuario"
        fi
        
        echo ""
        echo -e "${YELLOW}📋 Comandos para executar:${NC}"
        echo ""
        echo -e "${CYAN}# 1. Configurar Git (se necessário)${NC}"
        echo "git config user.name \"Seu Nome\""
        echo "git config user.email \"seu@email.com\""
        echo ""
        echo -e "${CYAN}# 2. Adicionar remote GitHub${NC}"
        echo "git remote add origin https://github.com/$GITHUB_USER/$PROJECT_NAME.git"
        echo ""
        echo -e "${CYAN}# 3. Commit e push${NC}"
        echo "git add ."
        echo "git commit -m \"Deploy ready for Glitch\""
        echo "git push -u origin main"
        echo ""
        echo -e "${CYAN}# 4. Deploy no Glitch${NC}"
        echo "# Acesse: https://glitch.com/create"
        echo "# Import: https://github.com/$GITHUB_USER/$PROJECT_NAME"
        
        # Salvar comandos em arquivo
        cat > git-commands.sh << EOF
#!/bin/bash
# Comandos Git personalizados gerados em $(date)

# Configurar Git
git config user.name "Seu Nome"
git config user.email "seu@email.com"

# Adicionar remote
git remote add origin https://github.com/$GITHUB_USER/$PROJECT_NAME.git

# Commit e push
git add .
git commit -m "Deploy ready for Glitch - $(date '+%Y-%m-%d %H:%M:%S')"
git push -u origin main

echo "✅ Pronto! Agora importe no Glitch:"
echo "https://glitch.com/create"
echo "GitHub URL: https://github.com/$GITHUB_USER/$PROJECT_NAME"
EOF
        
        chmod +x git-commands.sh
        echo ""
        echo -e "${GREEN}✅ Comandos salvos em: git-commands.sh${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Opção inválida!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${PURPLE}🎉 Deploy Process Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Checklist Final:${NC}"
echo "☐ Projeto enviado/preparado"
echo "☐ Importar no Glitch"
echo "☐ Configurar variáveis de ambiente"
echo "☐ Testar URLs principais"
echo ""
echo -e "${GREEN}🚀 Seu projeto DevOps estará online em minutos!${NC}"
