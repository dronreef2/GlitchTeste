# 🤖 Guia de Automação - DevOps Platform

Este guia aborda todos os aspectos de automação da plataforma, incluindo CI/CD, scripts automáticos e processos DevOps.

---

## 📋 Índice

- [🔄 Pipeline CI/CD](#-pipeline-cicd)
- [📜 Scripts de Automação](#-scripts-de-automação)
- [🛠️ Ferramentas de Automação](#️-ferramentas-de-automação)
- [📊 Automação de Monitoramento](#-automação-de-monitoramento)
- [🚀 Deploy Automatizado](#-deploy-automatizado)
- [⚙️ Configuração de Automação](#️-configuração-de-automação)

---

## 🔄 Pipeline CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: DevOps Platform Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
      
      - name: Security audit
        run: npm audit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t devops-platform .
      
      - name: Run container tests
        run: docker run --rm devops-platform npm test

  deploy-staging:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: |
          curl -X POST ${{ secrets.STAGING_WEBHOOK_URL }} \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" \
            -d '{"environment": "staging", "branch": "develop"}'

  deploy-production:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: |
          curl -X POST ${{ secrets.PRODUCTION_WEBHOOK_URL }} \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" \
            -d '{"environment": "production", "branch": "main"}'
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy-staging
  - deploy-production

variables:
  NODE_VERSION: "18.17.0"
  DOCKER_DRIVER: overlay2

test-job:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run test:coverage
    - npm run lint
    - npm audit
  artifacts:
    reports:
      coverage: coverage/
    paths:
      - coverage/

build-job:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy-staging:
  stage: deploy-staging
  script:
    - ./scripts/deploy.sh staging $CI_COMMIT_SHA
  only:
    - develop

deploy-production:
  stage: deploy-production
  script:
    - ./scripts/deploy.sh production $CI_COMMIT_SHA
  only:
    - main
  when: manual
```

## 📜 Scripts de Automação

### Script de Deploy Automatizado

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=$1
VERSION=$2
BACKUP_DIR="/opt/backups"
APP_DIR="/opt/devops-platform"

echo "🚀 Iniciando deploy para $ENVIRONMENT..."

# Função de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Função de backup
create_backup() {
    log "📦 Criando backup..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="$BACKUP_DIR/backup_${ENVIRONMENT}_${timestamp}.tar.gz"
    
    tar -czf "$backup_file" -C "$APP_DIR" . 2>/dev/null || true
    log "✅ Backup criado: $backup_file"
}

# Função de health check
health_check() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    log "🔍 Executando health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url/api/health" > /dev/null; then
            log "✅ Health check passou!"
            return 0
        fi
        
        log "⏳ Tentativa $attempt/$max_attempts falhou, aguardando..."
        sleep 10
        ((attempt++))
    done
    
    log "❌ Health check falhou após $max_attempts tentativas"
    return 1
}

# Função de rollback
rollback() {
    log "⏪ Executando rollback..."
    
    # Encontrar último backup
    latest_backup=$(ls -t $BACKUP_DIR/backup_${ENVIRONMENT}_*.tar.gz | head -n1)
    
    if [ -n "$latest_backup" ]; then
        log "📦 Restaurando de: $latest_backup"
        tar -xzf "$latest_backup" -C "$APP_DIR"
        systemctl restart devops-platform
        log "✅ Rollback concluído"
    else
        log "❌ Nenhum backup encontrado para rollback"
        return 1
    fi
}

# Função principal de deploy
deploy() {
    log "🔄 Parando serviços..."
    systemctl stop devops-platform || true
    
    create_backup
    
    log "📥 Baixando nova versão..."
    docker pull "registry.company.com/devops-platform:$VERSION"
    
    log "🔄 Atualizando configuração..."
    docker-compose -f "docker-compose.$ENVIRONMENT.yml" up -d
    
    log "⏳ Aguardando inicialização..."
    sleep 30
    
    if [ "$ENVIRONMENT" = "production" ]; then
        health_url="https://api.company.com"
    else
        health_url="https://staging-api.company.com"
    fi
    
    if health_check "$health_url"; then
        log "🎉 Deploy concluído com sucesso!"
        
        # Notificar Slack
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Deploy de $ENVIRONMENT concluído com sucesso!\"}" \
            "$SLACK_WEBHOOK_URL"
    else
        log "❌ Deploy falhou, executando rollback..."
        rollback
        
        # Notificar falha
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"❌ Deploy de $ENVIRONMENT falhou! Rollback executado.\"}" \
            "$SLACK_WEBHOOK_URL"
        
        exit 1
    fi
}

# Validar parâmetros
if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
    echo "Uso: $0 <environment> <version>"
    echo "Exemplo: $0 production v1.2.3"
    exit 1
fi

# Executar deploy
deploy
```

### Script de Monitoramento Contínuo

```bash
#!/bin/bash
# scripts/monitor.sh

SERVICES=("api" "worker" "monitor" "webssh" "webftp")
ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
LOG_FILE="/var/log/devops-platform/monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    local service=$1
    local port=$2
    
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        log "✅ $service está funcionando"
        return 0
    else
        log "❌ $service não está respondendo"
        return 1
    fi
}

check_resources() {
    # CPU
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log "⚠️ Alto uso de CPU: ${cpu_usage}%"
        alert "CPU usage high: ${cpu_usage}%"
    fi
    
    # Memória
    mem_usage=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
    if (( $(echo "$mem_usage > 85" | bc -l) )); then
        log "⚠️ Alto uso de memória: ${mem_usage}%"
        alert "Memory usage high: ${mem_usage}%"
    fi
    
    # Disco
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "⚠️ Alto uso de disco: ${disk_usage}%"
        alert "Disk usage high: ${disk_usage}%"
    fi
}

alert() {
    local message=$1
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 $message\"}" \
        "$ALERT_WEBHOOK"
}

restart_service() {
    local service=$1
    log "🔄 Reiniciando $service..."
    
    systemctl restart "devops-platform-$service"
    sleep 10
    
    if check_service "$service" "${service_ports[$service]}"; then
        log "✅ $service reiniciado com sucesso"
        alert "$service was restarted successfully"
    else
        log "❌ Falha ao reiniciar $service"
        alert "Failed to restart $service - manual intervention required"
    fi
}

# Portas dos serviços
declare -A service_ports=(
    ["api"]="3000"
    ["worker"]="3001"
    ["monitor"]="9090"
    ["webssh"]="2222"
    ["webftp"]="3333"
)

# Loop principal de monitoramento
while true; do
    log "🔍 Executando verificações de saúde..."
    
    for service in "${SERVICES[@]}"; do
        if ! check_service "$service" "${service_ports[$service]}"; then
            restart_service "$service"
        fi
    done
    
    check_resources
    
    log "⏳ Aguardando próxima verificação..."
    sleep 300  # 5 minutos
done
```

### Script de Backup Automatizado

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/backups"
RETENTION_DAYS=30
S3_BUCKET="company-devops-backups"
ENVIRONMENT=${NODE_ENV:-development}

create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="devops-platform_${ENVIRONMENT}_${timestamp}"
    local backup_file="$BACKUP_DIR/${backup_name}.tar.gz"
    
    echo "📦 Criando backup: $backup_name"
    
    # Backup de arquivos
    tar -czf "$backup_file" \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='.git' \
        /opt/devops-platform
    
    # Backup de banco de dados (se existir)
    if [ ! -z "$DATABASE_URL" ]; then
        echo "🗄️ Fazendo backup do banco de dados..."
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/${backup_name}_db.sql"
        gzip "$BACKUP_DIR/${backup_name}_db.sql"
    fi
    
    # Upload para S3
    if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
        echo "☁️ Enviando backup para S3..."
        aws s3 cp "$backup_file" "s3://$S3_BUCKET/$(basename $backup_file)"
        
        if [ -f "$BACKUP_DIR/${backup_name}_db.sql.gz" ]; then
            aws s3 cp "$BACKUP_DIR/${backup_name}_db.sql.gz" "s3://$S3_BUCKET/$(basename ${backup_name}_db.sql.gz)"
        fi
    fi
    
    echo "✅ Backup concluído: $backup_file"
}

cleanup_old_backups() {
    echo "🧹 Limpando backups antigos (>$RETENTION_DAYS dias)..."
    
    find "$BACKUP_DIR" -name "devops-platform_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*_db.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Limpeza no S3
    if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
        aws s3 ls "s3://$S3_BUCKET/" | \
        awk '$1 < "'$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)'" {print $4}' | \
        xargs -I {} aws s3 rm "s3://$S3_BUCKET/{}"
    fi
    
    echo "✅ Limpeza concluída"
}

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Executar backup e limpeza
create_backup
cleanup_old_backups

echo "🎉 Processo de backup finalizado!"
```

## 🛠️ Ferramentas de Automação

### Docker Compose para Ambientes

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  api:
    image: devops-platform:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - API_PORT=3000
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.company.com`)"
      - "traefik.http.routers.api.tls=true"

  worker:
    image: devops-platform:latest
    restart: unless-stopped
    command: npm run worker
    environment:
      - NODE_ENV=production
      - WORKER_CONCURRENCY=4
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis

  monitor:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana

  redis:
    image: redis:alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  prometheus_data:
  grafana_data:
  redis_data:
```

### Terraform para Infraestrutura

```hcl
# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "devops_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "devops-platform-vpc"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public_subnet" {
  count = 2
  
  vpc_id                  = aws_vpc.devops_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "devops-public-subnet-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "devops_igw" {
  vpc_id = aws_vpc.devops_vpc.id

  tags = {
    Name = "devops-platform-igw"
  }
}

# Route Table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.devops_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.devops_igw.id
  }

  tags = {
    Name = "devops-public-route-table"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "devops_cluster" {
  name = "devops-platform-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "devops_alb" {
  name               = "devops-platform-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnet[*].id

  enable_deletion_protection = false
}

# Security Group para ALB
resource "aws_security_group" "alb_sg" {
  name        = "devops-alb-sg"
  description = "Security group for DevOps Platform ALB"
  vpc_id      = aws_vpc.devops_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 📊 Automação de Monitoramento

### Configuração do Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'devops-platform-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: /api/metrics
    scrape_interval: 10s

  - job_name: 'devops-platform-worker'
    static_configs:
      - targets: ['worker:3001']
    metrics_path: /metrics

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

### Regras de Alerta

```yaml
# alert_rules.yml
groups:
  - name: devops-platform-alerts
    rules:
      - alert: HighCPUUsage
        expr: (100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% for more than 5 minutes"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% for more than 5 minutes"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service has been down for more than 1 minute"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in {{ $labels.job }}"
          description: "Error rate is above 10% for more than 5 minutes"
```

## 🚀 Deploy Automatizado

### Makefile para Automação

```makefile
# Makefile
.PHONY: help install test lint build deploy-dev deploy-staging deploy-prod

help: ## Mostrar ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependências
	npm ci
	docker-compose -f docker-compose.dev.yml pull

test: ## Executar testes
	npm run test:coverage
	npm run lint
	npm audit

build: ## Build da aplicação
	docker build -t devops-platform:latest .
	docker-compose -f docker-compose.dev.yml build

deploy-dev: ## Deploy para desenvolvimento
	@echo "🚀 Deploying to development..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development deployment complete"

deploy-staging: ## Deploy para staging
	@echo "🚀 Deploying to staging..."
	./scripts/deploy.sh staging latest
	@echo "✅ Staging deployment complete"

deploy-prod: ## Deploy para produção
	@echo "🚀 Deploying to production..."
	./scripts/deploy.sh production $(VERSION)
	@echo "✅ Production deployment complete"

logs: ## Ver logs dos serviços
	docker-compose logs -f

monitor: ## Iniciar monitoramento
	./scripts/monitor.sh &
	@echo "📊 Monitoring started"

backup: ## Executar backup
	./scripts/backup.sh
	@echo "💾 Backup completed"

clean: ## Limpeza
	docker system prune -f
	docker volume prune -f
	@echo "🧹 Cleanup completed"
```

---

<div align="center">

**🤖 Automação Completa Configurada**

*Todos os processos automatizados para máxima eficiência DevOps*

</div>
