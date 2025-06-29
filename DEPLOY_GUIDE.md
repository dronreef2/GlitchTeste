# 🚀 Deploy Guide - Guia Completo de Deploy

Guia completo para deploy da plataforma DevOps em diferentes ambientes, incluindo estratégias, automação e melhores práticas.

---

## 📋 Índice

- [🏗️ Estratégias de Deploy](#️-estratégias-de-deploy)
- [🌍 Ambientes de Deploy](#-ambientes-de-deploy)
- [🐳 Deploy com Docker](#-deploy-com-docker)
- [☁️ Deploy em Cloud](#️-deploy-em-cloud)
- [🔧 Configuração de Infraestrutura](#-configuração-de-infraestrutura)
- [📊 Monitoramento de Deploy](#-monitoramento-de-deploy)

---

## 🏗️ Estratégias de Deploy

### Blue-Green Deploy

```bash
#!/bin/bash
# scripts/blue-green-deploy.sh

set -e

ENVIRONMENT=$1
NEW_VERSION=$2
HEALTH_CHECK_URL=$3

echo "🔵 Iniciando Blue-Green Deploy..."

# Cores atuais
CURRENT_COLOR=$(docker ps --filter "label=environment=${ENVIRONMENT}" --format "table {{.Labels}}" | grep color | cut -d'=' -f2)
NEW_COLOR="blue"

if [ "$CURRENT_COLOR" = "blue" ]; then
    NEW_COLOR="green"
fi

echo "📊 Cor atual: $CURRENT_COLOR"
echo "🆕 Nova cor: $NEW_COLOR"

# Deploy da nova versão
echo "🚀 Deployando versão $NEW_VERSION com cor $NEW_COLOR..."
docker-compose -f docker-compose.${ENVIRONMENT}.yml up -d \
    --scale app-${NEW_COLOR}=3 \
    app-${NEW_COLOR}

# Aguardar inicialização
echo "⏳ Aguardando inicialização da nova versão..."
sleep 30

# Health check da nova versão
echo "🔍 Executando health check..."
for i in {1..10}; do
    if curl -sf "${HEALTH_CHECK_URL}" > /dev/null; then
        echo "✅ Health check passou!"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Health check falhou após 10 tentativas"
        docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-${NEW_COLOR}
        exit 1
    fi
    
    echo "⏳ Tentativa $i/10 falhou, aguardando..."
    sleep 10
done

# Trocar tráfego para nova versão
echo "🔄 Redirecionando tráfego para nova versão..."
# Atualizar load balancer ou proxy reverso
update_load_balancer $NEW_COLOR

# Aguardar estabilização
sleep 30

# Verificar se nova versão está estável
echo "📊 Verificando estabilidade da nova versão..."
ERROR_RATE=$(get_error_rate)
if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
    echo "❌ Taxa de erro alta: ${ERROR_RATE}%"
    echo "⏪ Executando rollback..."
    update_load_balancer $CURRENT_COLOR
    docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-${NEW_COLOR}
    exit 1
fi

# Remover versão antiga
echo "🗑️ Removendo versão antiga..."
docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-${CURRENT_COLOR}
docker-compose -f docker-compose.${ENVIRONMENT}.yml rm -f app-${CURRENT_COLOR}

echo "🎉 Blue-Green Deploy concluído com sucesso!"
```

### Canary Deploy

```bash
#!/bin/bash
# scripts/canary-deploy.sh

set -e

ENVIRONMENT=$1
NEW_VERSION=$2
CANARY_PERCENTAGE=${3:-10}

echo "🐤 Iniciando Canary Deploy..."

# Deploy da versão canary
echo "🚀 Deployando versão canary $NEW_VERSION..."
docker-compose -f docker-compose.${ENVIRONMENT}.yml up -d \
    --scale app-canary=1 \
    app-canary

# Configurar roteamento canary
echo "🔀 Configurando roteamento canary (${CANARY_PERCENTAGE}%)..."
configure_canary_routing $CANARY_PERCENTAGE

# Monitorar métricas por 10 minutos
echo "📊 Monitorando métricas por 10 minutos..."
for i in {1..10}; do
    echo "⏱️ Minuto $i/10..."
    
    # Verificar métricas
    ERROR_RATE=$(get_canary_error_rate)
    RESPONSE_TIME=$(get_canary_response_time)
    
    echo "📈 Taxa de erro: ${ERROR_RATE}%"
    echo "⏱️ Tempo de resposta: ${RESPONSE_TIME}ms"
    
    # Verificar se métricas estão dentro do aceitável
    if (( $(echo "$ERROR_RATE > 5" | bc -l) )) || (( $(echo "$RESPONSE_TIME > 1000" | bc -l) )); then
        echo "❌ Métricas fora do aceitável!"
        echo "⏪ Executando rollback do canary..."
        configure_canary_routing 0
        docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-canary
        exit 1
    fi
    
    sleep 60
done

# Promover canary para produção
echo "✅ Canary estável! Promovendo para produção..."

# Gradualmente aumentar tráfego
for percentage in 25 50 75 100; do
    echo "📈 Aumentando tráfego canary para ${percentage}%..."
    configure_canary_routing $percentage
    sleep 120
    
    # Verificar métricas novamente
    ERROR_RATE=$(get_canary_error_rate)
    if (( $(echo "$ERROR_RATE > 3" | bc -l) )); then
        echo "❌ Taxa de erro alta em ${percentage}%: ${ERROR_RATE}%"
        echo "⏪ Executando rollback..."
        configure_canary_routing 0
        docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-canary
        exit 1
    fi
done

# Finalizar deploy
echo "🔄 Substituindo versão principal..."
docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-main
docker tag app:canary app:main
docker-compose -f docker-compose.${ENVIRONMENT}.yml up -d app-main
docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-canary

echo "🎉 Canary Deploy concluído com sucesso!"
```

### Rolling Deploy

```bash
#!/bin/bash
# scripts/rolling-deploy.sh

set -e

ENVIRONMENT=$1
NEW_VERSION=$2
INSTANCES=${3:-3}

echo "🔄 Iniciando Rolling Deploy..."

# Atualizar instâncias uma por vez
for i in $(seq 1 $INSTANCES); do
    echo "🔄 Atualizando instância $i/$INSTANCES..."
    
    # Parar uma instância
    docker-compose -f docker-compose.${ENVIRONMENT}.yml stop app-$i
    
    # Aguardar drenagem de conexões
    echo "⏳ Aguardando drenagem de conexões..."
    sleep 30
    
    # Atualizar e iniciar instância
    docker-compose -f docker-compose.${ENVIRONMENT}.yml up -d app-$i
    
    # Aguardar health check
    echo "🔍 Verificando health da instância $i..."
    for attempt in {1..10}; do
        if health_check_instance $i; then
            echo "✅ Instância $i está saudável!"
            break
        fi
        
        if [ $attempt -eq 10 ]; then
            echo "❌ Instância $i falhou no health check!"
            echo "⏪ Executando rollback..."
            rollback_instance $i
            exit 1
        fi
        
        sleep 10
    done
    
    echo "✅ Instância $i atualizada com sucesso!"
    
    # Aguardar antes da próxima instância
    if [ $i -lt $INSTANCES ]; then
        echo "⏳ Aguardando antes da próxima instância..."
        sleep 60
    fi
done

echo "🎉 Rolling Deploy concluído com sucesso!"
```

## 🌍 Ambientes de Deploy

### Configuração de Desenvolvimento

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - API_PORT=3000
      - LOG_LEVEL=debug
      - HOT_RELOAD=true
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    command: npm run dev
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_dev_data:/data

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: devops_platform_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.dev.yml:/etc/prometheus/prometheus.yml

volumes:
  redis_dev_data:
  postgres_dev_data:
```

### Configuração de Staging

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  app-blue:
    image: ${REGISTRY}/devops-platform:${VERSION}
    environment:
      - NODE_ENV=staging
      - API_PORT=3000
      - DATABASE_URL=${STAGING_DATABASE_URL}
      - REDIS_URL=${STAGING_REDIS_URL}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app-blue.rule=Host(`staging-api.company.com`)"
      - "traefik.http.services.app-blue.loadbalancer.server.port=3000"
      - "environment=staging"
      - "color=blue"
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    restart: unless-stopped

  app-green:
    image: ${REGISTRY}/devops-platform:${VERSION}
    environment:
      - NODE_ENV=staging
      - API_PORT=3000
      - DATABASE_URL=${STAGING_DATABASE_URL}
      - REDIS_URL=${STAGING_REDIS_URL}
    labels:
      - "traefik.enable=false"
      - "environment=staging" 
      - "color=green"
    deploy:
      replicas: 0
    restart: unless-stopped

  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  monitoring:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.staging.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    volumes:
      - grafana_staging_data:/var/lib/grafana

volumes:
  grafana_staging_data:
```

### Configuração de Produção

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: ${REGISTRY}/devops-platform:${VERSION}
    environment:
      - NODE_ENV=production
      - API_PORT=3000
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - WEBHOOK_URL=${WEBHOOK_URL}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`api.company.com`)"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  redis:
    image: redis:alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_prod_data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.prod.yml:/etc/prometheus/prometheus.yml
      - prometheus_prod_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    volumes:
      - grafana_prod_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    restart: unless-stopped

volumes:
  redis_prod_data:
  prometheus_prod_data:
  grafana_prod_data:
```

## 🐳 Deploy com Docker

### Dockerfile Otimizado

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação (se necessário)
RUN npm run build 2>/dev/null || true

# Estágio de produção
FROM node:18-alpine AS production

# Instalar dumb-init para gerenciamento de processos
RUN apk add --no-cache dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar node_modules do builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Expor porta
EXPOSE 3000

# Usar usuário não-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### Build Multi-Stage

```dockerfile
# Dockerfile.multi
# Estágio 1: Desenvolvimento
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 9229
CMD ["npm", "run", "dev"]

# Estágio 2: Testing
FROM development AS testing
RUN npm run test
RUN npm run lint
RUN npm audit

# Estágio 3: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build 2>/dev/null || true

# Estágio 4: Produção
FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init curl
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### Docker Compose com Secrets

```yaml
# docker-compose.secure.yml
version: '3.8'

services:
  app:
    image: devops-platform:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL_FILE=/run/secrets/database_url
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    secrets:
      - database_url
      - jwt_secret
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 60s
        max_failure_ratio: 0.3
      restart_policy:
        condition: on-failure

secrets:
  database_url:
    external: true
  jwt_secret:
    external: true
```

## ☁️ Deploy em Cloud

### AWS ECS com Fargate

```json
{
  "family": "devops-platform-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "devops-platform",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/devops-platform:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "API_PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/devops-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-platform
  labels:
    app: devops-platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: devops-platform
  template:
    metadata:
      labels:
        app: devops-platform
    spec:
      containers:
      - name: devops-platform
        image: devops-platform:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: devops-platform-service
spec:
  selector:
    app: devops-platform
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Helm Chart

```yaml
# helm/devops-platform/values.yml
replicaCount: 3

image:
  repository: devops-platform
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: api.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-company-com-tls
      hosts:
        - api.company.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - devops-platform
        topologyKey: kubernetes.io/hostname
```

## 📊 Monitoramento de Deploy

### Script de Monitoramento

```bash
#!/bin/bash
# scripts/monitor-deploy.sh

ENVIRONMENT=$1
DEPLOY_ID=$2
WEBHOOK_URL=$3

monitor_deploy() {
    local start_time=$(date +%s)
    local timeout=1800  # 30 minutos
    
    echo "📊 Monitorando deploy $DEPLOY_ID..."
    
    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            echo "⏰ Timeout de deploy atingido (30 minutos)"
            notify_failure "Deploy timeout: $DEPLOY_ID"
            exit 1
        fi
        
        # Verificar health dos serviços
        if ! check_services_health; then
            echo "❌ Serviços não estão saudáveis"
            notify_failure "Services unhealthy: $DEPLOY_ID"
            exit 1
        fi
        
        # Verificar métricas
        error_rate=$(get_error_rate)
        response_time=$(get_avg_response_time)
        cpu_usage=$(get_cpu_usage)
        memory_usage=$(get_memory_usage)
        
        echo "📈 Métricas atuais:"
        echo "   Error rate: ${error_rate}%"
        echo "   Response time: ${response_time}ms"
        echo "   CPU usage: ${cpu_usage}%"
        echo "   Memory usage: ${memory_usage}%"
        
        # Verificar se métricas estão dentro do aceitável
        if (( $(echo "$error_rate > 5" | bc -l) )); then
            echo "❌ Taxa de erro muito alta: ${error_rate}%"
            notify_failure "High error rate: ${error_rate}%"
            exit 1
        fi
        
        if (( $(echo "$response_time > 2000" | bc -l) )); then
            echo "❌ Tempo de resposta muito alto: ${response_time}ms"
            notify_failure "High response time: ${response_time}ms"
            exit 1
        fi
        
        if (( $(echo "$cpu_usage > 90" | bc -l) )); then
            echo "⚠️ Uso de CPU alto: ${cpu_usage}%"
            notify_warning "High CPU usage: ${cpu_usage}%"
        fi
        
        if (( $(echo "$memory_usage > 90" | bc -l) )); then
            echo "⚠️ Uso de memória alto: ${memory_usage}%"
            notify_warning "High memory usage: ${memory_usage}%"
        fi
        
        # Verificar se deploy foi concluído
        if is_deploy_complete; then
            echo "✅ Deploy concluído com sucesso!"
            notify_success "Deploy completed: $DEPLOY_ID"
            break
        fi
        
        sleep 30
    done
}

check_services_health() {
    local services=("api" "worker" "monitor")
    
    for service in "${services[@]}"; do
        if ! curl -sf "http://localhost:3000/api/health" > /dev/null; then
            return 1
        fi
    done
    
    return 0
}

get_error_rate() {
    # Implementar coleta da taxa de erro via Prometheus ou logs
    echo "0.5"
}

get_avg_response_time() {
    # Implementar coleta do tempo de resposta médio
    echo "150"
}

get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'
}

get_memory_usage() {
    free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}'
}

is_deploy_complete() {
    # Verificar se todas as instâncias foram atualizadas
    local expected_version=$NEW_VERSION
    local running_instances=$(docker ps --filter "label=version=$expected_version" --format "table {{.ID}}" | wc -l)
    local total_instances=3
    
    [ $running_instances -eq $total_instances ]
}

notify_success() {
    local message=$1
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ $message\"}" \
        "$WEBHOOK_URL"
}

notify_failure() {
    local message=$1
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"❌ $message\"}" \
        "$WEBHOOK_URL"
}

notify_warning() {
    local message=$1
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠️ $message\"}" \
        "$WEBHOOK_URL"
}

# Executar monitoramento
monitor_deploy
```

---

<div align="center">

**🚀 Deploy Automatizado e Monitorado**

*Estratégias robustas para deploy em qualquer ambiente*

</div>
