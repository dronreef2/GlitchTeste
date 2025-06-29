# 📊 Monitoramento - Setup Completo de Observabilidade

Guia completo para configuração de monitoramento, métricas, logs e alertas da plataforma DevOps.

---

## 📋 Índice

- [🏗️ Arquitetura de Monitoramento](#️-arquitetura-de-monitoramento)
- [📈 Métricas com Prometheus](#-métricas-com-prometheus)
- [📊 Dashboards com Grafana](#-dashboards-com-grafana)
- [🚨 Sistema de Alertas](#-sistema-de-alertas)
- [📝 Centralização de Logs](#-centralização-de-logs)
- [🔍 Distributed Tracing](#-distributed-tracing)

---

## 🏗️ Arquitetura de Monitoramento

### Stack de Observabilidade

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Application │───►│  Prometheus  │───►│   Grafana   │
│  (Metrics)  │    │  (Storage)   │    │(Visualization)│
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    Logs     │───►│ Elasticsearch│───►│   Kibana    │
│  (Fluentd)  │    │   (Storage)  │    │   (Logs)    │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Traces    │───►│    Jaeger    │───►│ AlertManager│
│  (OpenTel)  │    │  (Tracing)   │    │  (Alerts)   │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Docker Compose Monitoramento

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin123}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SMTP_ENABLED=true
      - GF_SMTP_HOST=${SMTP_HOST}
      - GF_SMTP_USER=${SMTP_USER}
      - GF_SMTP_PASSWORD=${SMTP_PASSWORD}
      - GF_SMTP_FROM_ADDRESS=${SMTP_FROM}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - ./grafana/plugins:/var/lib/grafana/plugins
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
      - '--cluster.advertise-address=0.0.0.0:9093'
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
    restart: unless-stopped

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    restart: unless-stopped

  fluentd:
    image: fluent/fluentd:latest
    container_name: fluentd
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf
      - /var/log:/var/log:ro
    depends_on:
      - elasticsearch
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "16686:16686"
      - "14268:14268"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
  elasticsearch_data:
```

## 📈 Métricas com Prometheus

### Configuração do Prometheus

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'devops-platform-monitor'

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # DevOps Platform API
  - job_name: 'devops-platform-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: /api/metrics
    scrape_interval: 10s
    scrape_timeout: 5s

  # Node Exporter (Sistema)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # cAdvisor (Containers)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # Prometheus próprio
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Application específicos
  - job_name: 'devops-platform-workers'
    static_configs:
      - targets: ['worker-1:3001', 'worker-2:3001', 'worker-3:3001']
    metrics_path: /metrics

  # Serviços externos
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://api.company.com/api/health
        - https://staging-api.company.com/api/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### Regras de Alerta

```yaml
# prometheus/rules/application.yml
groups:
  - name: devops-platform-application
    rules:
      # Alta taxa de erro
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{status=~"5.."}[5m]) /
            rate(http_requests_total[5m])
          ) * 100 > 5
        for: 5m
        labels:
          severity: critical
          team: devops
        annotations:
          summary: "Alta taxa de erro na aplicação"
          description: "Taxa de erro de {{ $value }}% nos últimos 5 minutos"
          runbook_url: "https://wiki.company.com/runbooks/high-error-rate"

      # Alto tempo de resposta
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 3m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "Alto tempo de resposta"
          description: "95% das requisições levam mais de {{ $value }}s"

      # Aplicação fora do ar
      - alert: ApplicationDown
        expr: up{job="devops-platform-api"} == 0
        for: 1m
        labels:
          severity: critical
          team: devops
        annotations:
          summary: "Aplicação fora do ar"
          description: "A aplicação {{ $labels.instance }} está fora do ar"

      # Alto uso de memória
      - alert: HighMemoryUsage
        expr: |
          (
            process_resident_memory_bytes / 
            (1024 * 1024 * 1024)
          ) > 1
        for: 10m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "Alto uso de memória"
          description: "Aplicação usando {{ $value }}GB de memória"

      # Muitas conexões ativas
      - alert: HighActiveConnections
        expr: active_connections_total > 1000
        for: 5m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "Muitas conexões ativas"
          description: "{{ $value }} conexões ativas"

  - name: devops-platform-system
    rules:
      # Alto uso de CPU
      - alert: HighCPUUsage
        expr: |
          (
            100 - (
              avg by (instance) (
                rate(node_cpu_seconds_total{mode="idle"}[5m])
              ) * 100
            )
          ) > 80
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "Alto uso de CPU"
          description: "CPU em {{ $value }}% no servidor {{ $labels.instance }}"

      # Pouco espaço em disco
      - alert: LowDiskSpace
        expr: |
          (
            (
              node_filesystem_avail_bytes{mountpoint="/"} /
              node_filesystem_size_bytes{mountpoint="/"}
            ) * 100
          ) < 10
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Pouco espaço em disco"
          description: "Apenas {{ $value }}% de espaço livre no disco"

      # Alto uso de memória do sistema
      - alert: HighSystemMemoryUsage
        expr: |
          (
            (
              node_memory_MemTotal_bytes - 
              node_memory_MemAvailable_bytes
            ) / node_memory_MemTotal_bytes
          ) * 100 > 90
        for: 10m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Alto uso de memória do sistema"
          description: "Memória do sistema em {{ $value }}%"

  - name: devops-platform-business
    rules:
      # Poucos deploys (pode indicar problema)
      - alert: LowDeployFrequency
        expr: |
          rate(deploys_total[24h]) < 0.1
        for: 1h
        labels:
          severity: info
          team: devops
        annotations:
          summary: "Baixa frequência de deploys"
          description: "Menos de 1 deploy nas últimas 24 horas"

      # Muitos deploys falhando
      - alert: HighDeployFailureRate
        expr: |
          (
            rate(deploys_total{status="failed"}[1h]) /
            rate(deploys_total[1h])
          ) * 100 > 50
        for: 30m
        labels:
          severity: warning
          team: devops
        annotations:
          summary: "Alta taxa de falha em deploys"
          description: "{{ $value }}% dos deploys falharam na última hora"
```

## 📊 Dashboards com Grafana

### Dashboard Principal da Aplicação

```json
{
  "dashboard": {
    "id": null,
    "title": "DevOps Platform - Application Overview",
    "tags": ["devops", "application"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 100},
                {"color": "red", "value": 500}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "(rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 5}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Response Time (95th percentile)",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 2}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "active_connections_total",
            "legendFormat": "Active Connections"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 500},
                {"color": "red", "value": 1000}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "Request Rate Over Time",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 6,
        "title": "Response Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_bucket[5m])",
            "format": "heatmap",
            "legendFormat": "{{le}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

### Dashboard de Deploy

```json
{
  "dashboard": {
    "title": "DevOps Platform - Deploy Metrics",
    "panels": [
      {
        "id": 1,
        "title": "Deploy Frequency",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(deploys_total[24h]) * 24 * 3600",
            "legendFormat": "Deploys per day"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "decimals": 1
          }
        }
      },
      {
        "id": 2,
        "title": "Deploy Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "(rate(deploys_total{status=\"success\"}[24h]) / rate(deploys_total[24h])) * 100",
            "legendFormat": "Success Rate %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 80},
                {"color": "green", "value": 95}
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Average Deploy Duration",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.5, rate(deploy_duration_seconds_bucket[24h]))",
            "legendFormat": "Median Duration"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 4,
        "title": "Deploy Timeline",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(deploys_total[1h])",
            "legendFormat": "{{environment}} - {{status}}"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Sistema de Alertas

### Configuração do AlertManager

```yaml
# alertmanager/alertmanager.yml
global:
  smtp_smarthost: '${SMTP_HOST}:587'
  smtp_from: '${SMTP_FROM}'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 0s
      repeat_interval: 5m
    
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 30m
    
    - match:
        team: infrastructure
      receiver: 'infrastructure-team'
    
    - match:
        team: devops
      receiver: 'devops-team'

receivers:
  - name: 'default'
    email_configs:
      - to: 'alerts@company.com'
        subject: '🚨 [{{ .GroupLabels.alertname }}] Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@company.com'
        subject: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          CRITICAL ALERT
          
          {{ range .Alerts }}
          Summary: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Runbook: {{ .Annotations.runbook_url }}
          {{ end }}
    
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        title: '🚨 CRITICAL ALERT'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          {{ end }}
        actions:
          - type: button
            text: 'View in Grafana'
            url: '{{ .CommonAnnotations.grafana_url }}'
          - type: button
            text: 'Runbook'
            url: '{{ .CommonAnnotations.runbook_url }}'

  - name: 'warning-alerts'
    email_configs:
      - to: 'devops@company.com'
        subject: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
    
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-warning'
        title: '⚠️ Warning Alert'

  - name: 'infrastructure-team'
    email_configs:
      - to: 'infrastructure@company.com'
        subject: '🔧 Infrastructure Alert: {{ .GroupLabels.alertname }}'
    
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_INTEGRATION_KEY}'
        description: '{{ .CommonAnnotations.summary }}'

  - name: 'devops-team'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#devops-alerts'
        title: 'DevOps Alert'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

### Templates de Notificação

```html
<!-- alertmanager/templates/email.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .critical { color: #d32f2f; }
        .warning { color: #f57c00; }
        .info { color: #1976d2; }
        .alert-box { 
            border-left: 4px solid #d32f2f; 
            padding: 10px; 
            margin: 10px 0; 
            background-color: #f5f5f5; 
        }
    </style>
</head>
<body>
    <h2>{{ .GroupLabels.alertname }} Alert</h2>
    
    {{ range .Alerts }}
    <div class="alert-box {{ .Labels.severity }}">
        <h3>{{ .Annotations.summary }}</h3>
        <p><strong>Description:</strong> {{ .Annotations.description }}</p>
        <p><strong>Severity:</strong> {{ .Labels.severity }}</p>
        <p><strong>Instance:</strong> {{ .Labels.instance }}</p>
        <p><strong>Started:</strong> {{ .StartsAt.Format "2006-01-02 15:04:05" }}</p>
        
        {{ if .Annotations.runbook_url }}
        <p><a href="{{ .Annotations.runbook_url }}">📖 Runbook</a></p>
        {{ end }}
        
        {{ if .Annotations.grafana_url }}
        <p><a href="{{ .Annotations.grafana_url }}">📊 View in Grafana</a></p>
        {{ end }}
    </div>
    {{ end }}
    
    <hr>
    <p><small>Sent by AlertManager at {{ .CommonAnnotations.timestamp }}</small></p>
</body>
</html>
```

## 📝 Centralização de Logs

### Configuração do Fluentd

```ruby
# fluentd/fluent.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<source>
  @type tail
  path /var/log/devops-platform/*.log
  pos_file /var/log/fluentd/devops-platform.log.pos
  tag devops.platform.*
  format json
  time_format %Y-%m-%d %H:%M:%S
</source>

<filter devops.platform.**>
  @type parser
  key_name message
  format json
  reserve_data true
</filter>

<filter devops.platform.**>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    environment "#{ENV['NODE_ENV']}"
    service devops-platform
    timestamp ${time}
  </record>
</filter>

<match devops.platform.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix devops-platform
  
  <buffer>
    @type file
    path /var/log/fluentd/buffer/devops-platform
    flush_mode interval
    flush_interval 5s
    chunk_limit_size 2M
    queue_limit_length 32
    retry_max_interval 30
    retry_forever true
  </buffer>
</match>

<match **>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix fluentd
  
  <buffer>
    flush_mode interval
    flush_interval 10s
  </buffer>
</match>
```

### Configuração de Logs Estruturados

```javascript
// utils/logger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
  },
  index: 'devops-platform-logs',
  messageType: 'log',
  transformer: (logData) => {
    return {
      '@timestamp': new Date().toISOString(),
      severity: logData.level,
      message: logData.message,
      meta: logData.meta,
      service: 'devops-platform',
      environment: process.env.NODE_ENV,
      hostname: require('os').hostname(),
      pid: process.pid
    };
  }
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'devops-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Adicionar Elasticsearch em produção
if (process.env.NODE_ENV === 'production') {
  logger.add(new ElasticsearchTransport(esTransportOpts));
}

// Middleware de logging para Express
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.id
    });
  });
  
  next();
};

module.exports = { logger, requestLogger };
```

## 🔍 Distributed Tracing

### Configuração do OpenTelemetry

```javascript
// utils/tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'devops-platform',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // Disable file system instrumentation
    },
  })],
});

// Inicializar tracing
sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
```

### Instrumentação Manual

```javascript
// utils/customTracing.js
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('devops-platform', '1.0.0');

// Middleware para criar spans customizados
const createSpan = (name, operation) => {
  return async (req, res, next) => {
    const span = tracer.startSpan(`${name}.${operation}`, {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'user.id': req.user?.id,
        'operation': operation
      }
    });

    req.span = span;
    
    res.on('finish', () => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_size': res.get('content-length') || 0
      });
      
      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      }
      
      span.end();
    });
    
    next();
  };
};

// Função para instrumentar operações assíncronas
const instrumentAsync = async (name, operation, attributes = {}) => {
  const span = tracer.startSpan(name, { attributes });
  
  try {
    const result = await operation(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    span.end();
  }
};

module.exports = {
  tracer,
  createSpan,
  instrumentAsync
};
```

---

<div align="center">

**📊 Monitoramento Completo e Observabilidade Total**

*Visibilidade completa de toda a infraestrutura e aplicações*

</div>
