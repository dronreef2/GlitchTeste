#!/bin/bash

# Script de CI/CD para automação de deploy
# Uso: ./scripts/ci-cd.sh [ambiente]

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-staging}
BUILD_NUMBER=${GITHUB_RUN_NUMBER:-$(date +%Y%m%d%H%M%S)}
COMMIT_SHA=${GITHUB_SHA:-$(git rev-parse --short HEAD)}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para verificar pré-requisitos
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    # Verificar se Node.js está instalado
    if ! command -v node &> /dev/null; then
        log_error "Node.js não está instalado"
        exit 1
    fi
    
    # Verificar se npm está instalado
    if ! command -v npm &> /dev/null; then
        log_error "npm não está instalado"
        exit 1
    fi
    
    # Verificar se Docker está instalado
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    # Verificar se git está instalado
    if ! command -v git &> /dev/null; then
        log_error "Git não está instalado"
        exit 1
    fi
    
    log_success "Todos os pré-requisitos estão atendidos"
}

# Função para instalar dependências
install_dependencies() {
    log_info "Instalando dependências..."
    cd "$PROJECT_ROOT"
    
    # Limpar cache do npm
    npm cache clean --force
    
    # Instalar dependências
    npm ci --production=false
    
    log_success "Dependências instaladas com sucesso"
}

# Função para executar lint
run_lint() {
    log_info "Executando análise de código (lint)..."
    cd "$PROJECT_ROOT"
    
    npm run lint
    
    log_success "Análise de código concluída"
}

# Função para executar testes
run_tests() {
    log_info "Executando testes..."
    cd "$PROJECT_ROOT"
    
    # Definir variáveis de ambiente para testes
    export NODE_ENV=test
    export DATABASE_URL="postgresql://test:test@localhost:5432/devops_test"
    export REDIS_URL="redis://localhost:6379"
    
    # Executar testes unitários
    npm run test:unit
    
    # Executar testes de integração
    npm run test:integration
    
    # Gerar relatório de cobertura
    npm run test:coverage
    
    log_success "Todos os testes passaram"
}

# Função para análise de segurança
run_security_check() {
    log_info "Executando análise de segurança..."
    cd "$PROJECT_ROOT"
    
    # Auditoria de segurança
    npm audit --audit-level=high
    
    # Verificação de vulnerabilidades (se disponível)
    if command -v snyk &> /dev/null; then
        snyk test
    fi
    
    log_success "Análise de segurança concluída"
}

# Função para build da aplicação
build_application() {
    log_info "Fazendo build da aplicação..."
    cd "$PROJECT_ROOT"
    
    # Build da aplicação
    npm run build
    
    log_success "Build da aplicação concluído"
}

# Função para build da imagem Docker
build_docker_image() {
    log_info "Fazendo build da imagem Docker..."
    cd "$PROJECT_ROOT"
    
    # Definir tags da imagem
    IMAGE_NAME="devops-platform"
    IMAGE_TAG="${ENVIRONMENT}-${BUILD_NUMBER}"
    LATEST_TAG="${ENVIRONMENT}-latest"
    
    # Build da imagem
    docker build \
        --build-arg BUILD_NUMBER="$BUILD_NUMBER" \
        --build-arg COMMIT_SHA="$COMMIT_SHA" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        -t "$IMAGE_NAME:$IMAGE_TAG" \
        -t "$IMAGE_NAME:$LATEST_TAG" \
        .
    
    log_success "Imagem Docker criada: $IMAGE_NAME:$IMAGE_TAG"
}

# Função para executar testes de performance
run_performance_tests() {
    if [ "$ENVIRONMENT" = "staging" ]; then
        log_info "Executando testes de performance..."
        cd "$PROJECT_ROOT"
        
        # Aguardar aplicação estar pronta
        sleep 30
        
        # Executar testes de carga
        npm run test:performance
        
        log_success "Testes de performance concluídos"
    else
        log_info "Pulando testes de performance para ambiente $ENVIRONMENT"
    fi
}

# Função para fazer backup antes do deploy
backup_before_deploy() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Fazendo backup antes do deploy em produção..."
        
        # Executar script de backup
        node "$PROJECT_ROOT/scripts/backup.js" --create --type=pre-deploy
        
        log_success "Backup criado com sucesso"
    fi
}

# Função para fazer deploy
deploy_application() {
    log_info "Fazendo deploy para $ENVIRONMENT..."
    cd "$PROJECT_ROOT"
    
    # Executar script de deploy específico do ambiente
    case $ENVIRONMENT in
        "development")
            # Deploy local
            docker-compose -f docker-compose.dev.yml up -d --build
            ;;
        "staging")
            # Deploy para staging
            docker-compose -f docker-compose.staging.yml up -d --build
            ;;
        "production")
            # Deploy para produção
            docker-compose -f docker-compose.prod.yml up -d --build
            ;;
        *)
            log_error "Ambiente desconhecido: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    log_success "Deploy para $ENVIRONMENT concluído"
}

# Função para executar health check
run_health_check() {
    log_info "Executando health check..."
    cd "$PROJECT_ROOT"
    
    # Aguardar aplicação estar pronta
    sleep 30
    
    # Executar health check
    node "$PROJECT_ROOT/scripts/health-check.js"
    
    if [ $? -eq 0 ]; then
        log_success "Health check passou"
    else
        log_error "Health check falhou"
        exit 1
    fi
}

# Função para rollback em caso de falha
rollback_on_failure() {
    log_warning "Executando rollback devido a falha..."
    cd "$PROJECT_ROOT"
    
    # Executar rollback
    node "$PROJECT_ROOT/scripts/deploy.js" --rollback
    
    log_success "Rollback executado"
}

# Função para notificações
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deploy $ENVIRONMENT: $status - $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    log_info "Notificação enviada: $status - $message"
}

# Função para limpeza
cleanup() {
    log_info "Fazendo limpeza..."
    
    # Remover imagens Docker antigas (manter últimas 5)
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | \
    grep "devops-platform" | \
    tail -n +6 | \
    awk '{print $1":"$2}' | \
    xargs -r docker rmi
    
    log_success "Limpeza concluída"
}

# Função principal
main() {
    log_info "Iniciando pipeline CI/CD para ambiente: $ENVIRONMENT"
    log_info "Build Number: $BUILD_NUMBER"
    log_info "Commit SHA: $COMMIT_SHA"
    
    # Registrar início
    send_notification "INICIADO" "Pipeline iniciado"
    
    # Executar pipeline
    trap 'rollback_on_failure; send_notification "FALHOU" "Pipeline falhou"; exit 1' ERR
    
    check_prerequisites
    install_dependencies
    run_lint
    run_tests
    run_security_check
    build_application
    build_docker_image
    backup_before_deploy
    deploy_application
    run_health_check
    run_performance_tests
    cleanup
    
    # Registrar sucesso
    send_notification "SUCESSO" "Deploy concluído com sucesso"
    log_success "Pipeline CI/CD concluído com sucesso!"
}

# Verificar se o script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
