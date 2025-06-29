# 🛠️ DevOps Playbook - Guia Completo de Práticas

Playbook completo com todas as práticas, procedimentos e metodologias DevOps para a plataforma.

---

## 📋 Índice

- [🎯 Filosofia DevOps](#-filosofia-devops)
- [🔄 Práticas de CI/CD](#-práticas-de-cicd)
- [📚 Runbooks Operacionais](#-runbooks-operacionais)
- [🚨 Incident Response](#-incident-response)
- [📊 Métricas e KPIs](#-métricas-e-kpis)
- [🔒 Segurança DevSecOps](#-segurança-devsecops)

---

## 🎯 Filosofia DevOps

### Princípios Fundamentais

#### 1. **Culture** - Cultura Colaborativa
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Development │◄──►│   DevOps    │◄──►│ Operations  │
│    Team     │    │   Culture   │    │    Team     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Shared Goals │    │Collaboration│    │ Ownership   │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Práticas de Cultura:**
- **Shared Responsibility**: Todos são responsáveis pela qualidade e disponibilidade
- **Fail Fast, Learn Faster**: Falhar rápido para aprender e melhorar
- **Continuous Learning**: Aprendizado contínuo e compartilhamento de conhecimento
- **Blame-Free Culture**: Cultura sem culpa, focada em soluções
- **Transparency**: Transparência total em processos e métricas

#### 2. **Automation** - Automação Total
```yaml
# Níveis de Automação
automation_pyramid:
  level_4: "Self-Healing Systems"     # Sistema se corrige automaticamente
  level_3: "Automated Remediation"   # Correção automática de problemas
  level_2: "Automated Monitoring"    # Monitoramento e alertas automáticos
  level_1: "Automated Deployment"    # Deploy completamente automatizado
  level_0: "Automated Testing"       # Testes automatizados completos
```

#### 3. **Measurement** - Tudo é Medido
```
Metrics Categories:
├── Business Metrics
│   ├── Revenue Impact
│   ├── User Satisfaction
│   └── Feature Adoption
├── Application Metrics
│   ├── Performance
│   ├── Availability
│   └── Error Rates
├── Infrastructure Metrics
│   ├── Resource Utilization
│   ├── Capacity Planning
│   └── Cost Optimization
└── Team Metrics
    ├── Deployment Frequency
    ├── Lead Time
    └── Mean Time to Recovery
```

#### 4. **Sharing** - Compartilhamento de Conhecimento
- **Documentation as Code**: Documentação versionada junto com o código
- **Internal Tech Talks**: Apresentações técnicas internas regulares
- **Post-Mortems**: Análises detalhadas de incidentes sem culpa
- **Knowledge Base**: Base de conhecimento centralizada e atualizada
- **Mentoring Programs**: Programas de mentoria técnica

### Metodologias Aplicadas

#### CALMS Framework
```yaml
Culture:
  - Shared responsibility
  - Collaborative mindset
  - Continuous learning
  
Automation:
  - Infrastructure as Code
  - Automated testing
  - Automated deployment
  
Lean:
  - Eliminate waste
  - Optimize flow
  - Continuous improvement
  
Measurement:
  - Monitor everything
  - Data-driven decisions
  - Feedback loops
  
Sharing:
  - Knowledge sharing
  - Tool standardization
  - Best practices documentation
```

#### Three Ways of DevOps
1. **Flow**: Otimização do fluxo de trabalho (Dev → Ops → Customer)
2. **Feedback**: Loops de feedback rápidos e constantes
3. **Experimentation**: Cultura de experimentação e aprendizado contínuo

## 🔄 Práticas de CI/CD

### Pipeline de CI/CD Completo

```yaml
# .github/workflows/cicd-pipeline.yml
name: Complete CI/CD Pipeline

on:
  push:
    branches: [main, develop, feature/*]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: devops-platform

jobs:
  # ===== STAGE 1: CODE QUALITY =====
  code-quality:
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
      
      - name: Run linting
        run: npm run lint
      
      - name: Run code formatting check
        run: npm run format:check
      
      - name: Run complexity analysis
        run: npm run complexity
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  # ===== STAGE 2: SECURITY SCANNING =====
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'devops-platform'
          path: '.'
          format: 'HTML'

  # ===== STAGE 3: TESTING =====
  test:
    runs-on: ubuntu-latest
    needs: [code-quality, security]
    strategy:
      matrix:
        node-version: [16, 18, 20]
    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgres://postgres:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Generate test coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  # ===== STAGE 4: BUILD =====
  build:
    runs-on: ubuntu-latest
    needs: test
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ===== STAGE 5: DEPLOY TO STAGING =====
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          curl -X POST ${{ secrets.STAGING_WEBHOOK_URL }} \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "environment": "staging",
              "image": "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}",
              "branch": "${{ github.ref_name }}"
            }'
      
      - name: Run smoke tests
        run: |
          # Wait for deployment
          sleep 60
          
          # Run smoke tests
          curl -f ${{ secrets.STAGING_URL }}/api/health
          curl -f ${{ secrets.STAGING_URL }}/api/metrics

  # ===== STAGE 6: DEPLOY TO PRODUCTION =====
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          curl -X POST ${{ secrets.PRODUCTION_WEBHOOK_URL }} \
            -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "environment": "production",
              "image": "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}",
              "strategy": "blue-green"
            }'
      
      - name: Monitor deployment
        run: |
          # Monitor deployment for 10 minutes
          for i in {1..20}; do
            echo "Monitoring deployment... ($i/20)"
            
            # Check health
            if ! curl -sf ${{ secrets.PRODUCTION_URL }}/api/health; then
              echo "Health check failed!"
              exit 1
            fi
            
            # Check error rate
            ERROR_RATE=$(curl -s ${{ secrets.PRODUCTION_URL }}/api/metrics | jq '.error_rate')
            if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
              echo "Error rate too high: $ERROR_RATE%"
              exit 1
            fi
            
            sleep 30
          done
          
          echo "Deployment monitoring completed successfully!"
```

### Git Flow Otimizado

```
main branch (production)
├── hotfix/critical-bug-fix
├── release/v2.1.0
│   ├── feature/user-dashboard
│   ├── feature/api-improvements
│   └── bugfix/login-issue
└── develop branch (staging)
    ├── feature/new-monitoring
    ├── feature/database-optimization
    └── experiment/ai-recommendations
```

**Branch Policies:**
- `main`: Apenas código pronto para produção
- `develop`: Integração contínua, auto-deploy para staging
- `feature/*`: Funcionalidades isoladas com testes
- `hotfix/*`: Correções críticas direto para main
- `release/*`: Preparação de release com freeze de features

### Quality Gates

```yaml
# .github/workflows/quality-gates.yml
quality_gates:
  code_coverage:
    minimum: 80%
    trend: "not_decreasing"
  
  security_scan:
    vulnerabilities:
      critical: 0
      high: 0
      medium: 5
  
  performance:
    response_time_p95: "< 2s"
    error_rate: "< 1%"
    availability: "> 99.9%"
  
  code_quality:
    sonar_quality_gate: "passed"
    complexity_score: "< 10"
    duplication: "< 3%"
```

## 📚 Runbooks Operacionais

### Runbook: High Error Rate

```markdown
# 🚨 Runbook: High Error Rate

## Trigger
- Error rate > 5% for 5 minutes
- Alert: `HighErrorRate`

## Severity: 🔴 Critical

## Immediate Actions (5 minutes)

### 1. Assess Impact
```bash
# Check current error rate
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])*100"

# Check affected endpoints
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m]) by (route)"

# Check user impact
curl -s "http://grafana:3000/api/dashboards/uid/user-impact" -H "Authorization: Bearer $GRAFANA_API_KEY"
```

### 2. Quick Mitigation
```bash
# Option A: Rollback to previous version
kubectl rollout undo deployment/devops-platform

# Option B: Scale up if resource issue
kubectl scale deployment devops-platform --replicas=6

# Option C: Circuit breaker activation
curl -X POST "http://api.company.com/admin/circuit-breaker/enable"
```

### 3. Communication
```bash
# Post to incident channel
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 HIGH ERROR RATE DETECTED - Investigating"}' \
  $SLACK_INCIDENT_WEBHOOK

# Update status page
curl -X POST "https://api.statuspage.io/v1/pages/$PAGE_ID/incidents" \
  -H "Authorization: OAuth $STATUSPAGE_API_KEY" \
  -d '{"incident": {"name": "API Errors", "status": "investigating"}}'
```

## Investigation (15 minutes)

### Check Recent Deployments
```bash
# Check deployment history
kubectl rollout history deployment/devops-platform

# Check recent changes
git log --oneline -10 --since="2 hours ago"
```

### Analyze Logs
```bash
# Check application logs
kubectl logs -l app=devops-platform --tail=100 | grep ERROR

# Check specific error patterns
curl -X GET "http://elasticsearch:9200/devops-platform-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"range": {"@timestamp": {"gte": "now-1h"}}}}'
```

### Check Dependencies
```bash
# Check database connection
curl -f "http://api.company.com/api/health/db"

# Check Redis connection
curl -f "http://api.company.com/api/health/redis"

# Check external APIs
curl -f "http://api.company.com/api/health/external"
```

## Resolution Steps

1. **If Database Issue**: Restart database connection pool
2. **If Memory Issue**: Scale up instances
3. **If Code Issue**: Rollback deployment
4. **If External Dependency**: Enable circuit breaker

## Post-Incident Actions

1. **Write Post-Mortem** (within 24h)
2. **Update Runbook** with lessons learned
3. **Implement Preventive Measures**
4. **Schedule Team Review**
```

### Runbook: Service Down

```markdown
# 🚨 Runbook: Service Down

## Trigger
- Service health check failing
- Alert: `ServiceDown`

## Severity: 🔴 Critical

## Immediate Actions (2 minutes)

### 1. Verify Outage
```bash
# Check from multiple locations
curl -f "http://api.company.com/api/health"
curl -f "http://staging-api.company.com/api/health"

# Check load balancer status
curl -f "http://load-balancer:8080/health"
```

### 2. Emergency Response
```bash
# Activate disaster recovery
kubectl apply -f manifests/disaster-recovery.yml

# Scale emergency instances
kubectl scale deployment devops-platform-emergency --replicas=3

# Enable maintenance mode
curl -X POST "http://api.company.com/admin/maintenance" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Incident Communication
```bash
# Major incident notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 MAJOR INCIDENT: Service completely down"}' \
  $SLACK_MAJOR_INCIDENT_WEBHOOK

# Page on-call engineer
curl -X POST "https://events.pagerduty.com/v2/enqueue" \
  -H "Authorization: Token token=$PAGERDUTY_API_KEY" \
  -d '{"routing_key": "$PAGERDUTY_INTEGRATION_KEY", "event_action": "trigger"}'
```

## Investigation Process

### Check Infrastructure
```bash
# Check Kubernetes cluster
kubectl get nodes
kubectl get pods -A

# Check resource usage
kubectl top nodes
kubectl top pods
```

### Check Recent Changes
```bash
# Check recent deployments
kubectl get events --sort-by='.lastTimestamp' | head -20

# Check configuration changes
git log --oneline --since="6 hours ago" -- manifests/
```

## Recovery Procedures

1. **Restart Services**: `kubectl rollout restart deployment/devops-platform`
2. **Rollback**: `kubectl rollout undo deployment/devops-platform`
3. **Scale Resources**: `kubectl scale deployment devops-platform --replicas=5`
4. **Emergency Deployment**: Use backup infrastructure
```

## 🚨 Incident Response

### Incident Response Framework

```
Incident Severity Levels:
├── 🔴 Critical (Sev-1)
│   ├── Complete service outage
│   ├── Data loss or corruption
│   └── Security breach
├── 🟡 High (Sev-2)
│   ├── Major feature unavailable
│   ├── Performance severely degraded
│   └── Affecting >50% of users
├── 🟠 Medium (Sev-3)
│   ├── Minor feature issues
│   ├── Performance degraded
│   └── Affecting <50% of users
└── 🔵 Low (Sev-4)
    ├── Cosmetic issues
    ├── Documentation errors
    └── Feature requests
```

### Incident Response Process

#### 1. Detection & Alert (0-5 minutes)
```yaml
detection_sources:
  - monitoring_alerts: "Prometheus/Grafana"
  - user_reports: "Support tickets/Social media"
  - health_checks: "Automated monitoring"
  - team_discovery: "Manual detection"

immediate_actions:
  - acknowledge_alert: "Stop alert storm"
  - assess_severity: "Determine incident level"
  - form_response_team: "Assign roles"
  - create_incident_channel: "Communication hub"
```

#### 2. Response Team Structure
```
Incident Commander (IC)
├── Technical Lead
│   ├── Backend Engineer
│   ├── Infrastructure Engineer
│   └── Security Engineer (if needed)
├── Communications Lead
│   ├── Customer Support
│   └── Social Media Manager
└── Support Roles
    ├── Business Stakeholder
    └── Legal (if needed)
```

#### 3. Communication Plan
```yaml
internal_communication:
  - incident_channel: "#incident-YYYY-MM-DD-NNN"
  - status_updates: "Every 15 minutes"
  - escalation_path: "IC → Engineering Manager → CTO"

external_communication:
  - status_page: "Update within 10 minutes"
  - customer_emails: "For Sev-1/Sev-2"
  - social_media: "If publicly visible"
  - press_release: "Only for major outages"
```

### Post-Incident Process

#### Post-Mortem Template
```markdown
# Post-Mortem: [Incident Title]

## Incident Summary
- **Date**: YYYY-MM-DD
- **Duration**: X hours Y minutes
- **Severity**: Sev-X
- **Impact**: X users affected, $Y revenue impact

## Timeline
| Time | Event | Action Taken |
|------|-------|--------------|
| 14:30 | Alert triggered | IC acknowledged |
| 14:35 | Investigation started | Checked logs |
| 14:45 | Root cause identified | Applied fix |
| 15:00 | Service restored | Monitoring |

## Root Cause Analysis

### What Happened?
- Description of the technical issue

### Why Did It Happen?
- Root cause analysis using 5 Whys methodology

### Contributing Factors
- Factors that made the incident worse

## Impact Assessment
- **Users Affected**: X users (Y% of total)
- **Revenue Impact**: $X estimated loss
- **SLA Impact**: X minutes of downtime
- **Customer Satisfaction**: Z support tickets

## What Went Well?
- Fast detection and response
- Good communication
- Effective rollback

## What Went Poorly?
- Slow initial response
- Poor monitoring coverage
- Inadequate documentation

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| Improve monitoring | @engineer | 2024-01-15 | High |
| Update runbook | @devops | 2024-01-10 | Medium |
| Add integration tests | @qa | 2024-01-20 | High |

## Lessons Learned
- Key takeaways for the team
- Process improvements needed
```

## 📊 Métricas e KPIs

### DORA Metrics (DevOps Research & Assessment)

```yaml
dora_metrics:
  deployment_frequency:
    target: "Multiple times per day"
    current: "2.3 deployments/day"
    trend: "↗️ Improving"
    
  lead_time_for_changes:
    target: "< 1 day"
    current: "4.2 hours"
    trend: "↗️ Improving"
    
  change_failure_rate:
    target: "< 15%"
    current: "8.3%"
    trend: "↘️ Stable"
    
  time_to_restore_service:
    target: "< 1 hour"
    current: "23 minutes"
    trend: "↗️ Improving"
```

### SRE Golden Signals

```yaml
golden_signals:
  latency:
    p50: "120ms"
    p95: "380ms"
    p99: "850ms"
    target: "p95 < 500ms"
    
  traffic:
    requests_per_second: "1,240 RPS"
    peak_traffic: "3,500 RPS"
    growth_rate: "+15% MoM"
    
  errors:
    error_rate: "0.03%"
    target: "< 0.1%"
    critical_errors: "0"
    
  saturation:
    cpu_utilization: "45%"
    memory_utilization: "67%"
    disk_utilization: "23%"
```

### Business KPIs

```yaml
business_metrics:
  availability:
    target: "99.9%"
    current: "99.97%"
    sla_credits: "$0"
    
  performance:
    page_load_time: "1.2s"
    api_response_time: "180ms"
    user_satisfaction: "4.7/5"
    
  cost_efficiency:
    cost_per_request: "$0.0002"
    infrastructure_cost: "$15,000/month"
    cost_optimization: "12% reduction"
    
  security:
    security_incidents: "0"
    vulnerability_patches: "24h"
    compliance_score: "98%"
```

## 🔒 Segurança DevSecOps

### Security-First Pipeline

```yaml
# .github/workflows/security-pipeline.yml
security_stages:
  1_static_analysis:
    - sonarqube_scan
    - semgrep_security_scan
    - bandit_python_security
    - eslint_security_rules
    
  2_dependency_scanning:
    - npm_audit
    - snyk_vulnerability_scan
    - dependency_check_owasp
    - license_compliance_check
    
  3_secrets_scanning:
    - truffleHog_scan
    - gitleaks_scan
    - detect_secrets_scan
    
  4_container_security:
    - trivy_container_scan
    - clair_vulnerability_scan
    - docker_bench_security
    
  5_infrastructure_security:
    - terraform_security_scan
    - kubernetes_security_scan
    - cloud_security_posture
    
  6_runtime_security:
    - falco_runtime_monitoring
    - application_security_monitoring
    - network_security_monitoring
```

### Security Policies

```yaml
# security/policies.yml
security_policies:
  authentication:
    - multi_factor_authentication: required
    - password_policy: "12+ chars, complex"
    - session_timeout: "30 minutes"
    - failed_login_lockout: "5 attempts"
    
  authorization:
    - principle_of_least_privilege: enforced
    - role_based_access_control: implemented
    - regular_access_reviews: quarterly
    - privileged_access_management: required
    
  data_protection:
    - encryption_at_rest: "AES-256"
    - encryption_in_transit: "TLS 1.3"
    - data_classification: implemented
    - data_retention_policy: "7 years"
    
  compliance:
    - gdpr_compliance: required
    - soc2_compliance: in_progress
    - iso27001_compliance: planned
    - regular_audits: quarterly
```

### Security Monitoring

```yaml
# security/monitoring.yml
security_monitoring:
  log_analysis:
    - failed_authentication_attempts
    - privilege_escalation_attempts
    - suspicious_network_activity
    - data_access_anomalies
    
  threat_detection:
    - intrusion_detection_system: deployed
    - behavioral_analysis: enabled
    - threat_intelligence: integrated
    - automated_response: configured
    
  vulnerability_management:
    - continuous_scanning: enabled
    - patch_management: automated
    - zero_day_monitoring: active
    - penetration_testing: quarterly
    
  incident_response:
    - security_playbooks: documented
    - incident_response_team: trained
    - forensic_capabilities: available
    - external_partnerships: established
```

---

<div align="center">

**🛠️ DevOps Playbook Completo**

*Todas as práticas e procedimentos para uma operação DevOps de classe mundial*

**📈 Continuous Improvement • 🔒 Security First • 🤝 Culture of Collaboration**

</div>
