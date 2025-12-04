# CannaConverter Observability Guide

## Overview

This document describes the complete observability stack for CannaConverter, including metrics collection, dashboards, alerting, and operational procedures.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Node.js API   │     │  Java MPP Svc   │     │    Redis        │
│  (port 3001)    │     │  (port 8080)    │     │  (port 6379)    │
│                 │     │                 │     │                 │
│  /api/metrics   │     │ /actuator/prom  │     │  via BullMQ     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Prometheus         │
                    │    (scrapes metrics)    │
                    │    + Alert Rules        │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼─────────┐  ┌────▼────┐  ┌─────────▼─────────┐
    │     Grafana       │  │ Alert-  │  │    PagerDuty/     │
    │   (Dashboards)    │  │ manager │  │    Slack/Email    │
    └───────────────────┘  └─────────┘  └───────────────────┘
```

## Metrics Endpoints

### Node.js API (`/api/metrics`)

Exposes Prometheus-format metrics from the backend API.

**URL:** `http://localhost:3001/api/metrics`

**Metrics Exported:**

| Metric | Type | Description |
|--------|------|-------------|
| `conversion_jobs_total` | Counter | Total conversion jobs by status |
| `conversion_job_failures_total` | Counter | Failures by reason |
| `conversion_job_retries_total` | Counter | Total job retries |
| `conversion_job_duration_seconds` | Histogram | Job duration |
| `worker_processing_duration_seconds` | Histogram | Worker processing time |
| `api_requests_total` | Counter | API requests by method/path/status |
| `api_response_time_seconds` | Histogram | API response latency |
| `stripe_webhook_received_total` | Counter | Webhooks by event type |
| `stripe_webhook_failed_total` | Counter | Failed webhooks |
| `auto_refund_triggered_total` | Counter | Auto refunds |
| `credits_transactions_total` | Counter | Credits transactions |
| `queue_waiting_jobs` | Gauge | Jobs waiting in queue |
| `queue_active_jobs` | Gauge | Currently processing |
| `queue_delayed_jobs` | Gauge | Delayed/retrying jobs |
| `queue_failed_jobs` | Gauge | Failed jobs |
| `redis_latency_ms` | Gauge | Redis ping latency |
| `mpp_microservice_status` | Gauge | MPP service health (1=up) |
| `user_credits_total` | Gauge | Total user credits |
| `active_users_24h` | Gauge | Active users in 24h |

### Java MPP Service (`/actuator/prometheus`)

Spring Boot Actuator exposes JVM and application metrics.

**URL:** `http://localhost:8080/actuator/prometheus`

**Custom Metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `mpp_conversion_total` | Counter | Conversions by status |
| `mpp_conversion_duration_seconds` | Timer | Conversion time |
| `mpp_conversion_file_size_bytes` | Gauge | Last file size |

**Standard Spring Metrics:**
- `http_server_requests_seconds` - HTTP request latency
- `jvm_memory_used_bytes` - JVM memory usage
- `jvm_gc_pause_seconds` - GC pause times
- `process_uptime_seconds` - Process uptime

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Basic health check |
| `/api/health/live` | Kubernetes liveness probe |
| `/api/health/ready` | Kubernetes readiness probe |
| `/api/health/detailed` | Full system health with all checks |

## Grafana Dashboards

Four dashboards are provided in `grafana/`:

### 1. Workers Dashboard (`dashboard_workers.json`)

Monitors the BullMQ queue and worker health:

- Jobs Waiting / Active / Failed / Delayed (stat panels)
- Job Completion Rate (time series)
- Worker Processing Duration percentiles
- Redis Latency
- MPP Microservice Status
- Job Retries Rate

**Use for:** Queue backlog issues, worker performance, Redis health

### 2. Stripe & Payments Dashboard (`dashboard_stripe.json`)

Monitors payment processing:

- Total Webhooks Received / Failed
- Auto Refunds Triggered
- Pending Refund Recovery
- Webhook Events by Type (stacked bars)
- Credits Transactions (purchases/usage/refunds)
- Webhook Success Rate

**Use for:** Payment failures, refund monitoring, webhook issues

### 3. Converters Dashboard (`dashboard_converters.json`)

Monitors the conversion pipeline:

- Total Successful / Failed Conversions
- Conversion Success Rate
- Conversion Rate (per 5m)
- Conversion Duration Percentiles
- Failure Reasons breakdown
- MPP Microservice Response Time

**Use for:** Conversion quality, performance optimization

### 4. Infrastructure Dashboard (`dashboard_infra.json`)

System-level monitoring:

- Service Status panels (API, MPP, Redis)
- Active Users (24h)
- API Memory Usage
- API Uptime
- Requests per Second
- API Response Time Percentiles
- Memory Usage Over Time
- Infrastructure Latencies

**Use for:** System health, capacity planning, SLA monitoring

### Importing Dashboards

1. Open Grafana (default: http://localhost:3000)
2. Go to Dashboards → Import
3. Upload JSON file or paste contents
4. Select Prometheus data source
5. Click Import

## Alert Rules

Alert rules are defined in `prometheus/alerts.yml`.

### Alert Categories

#### Critical (Immediate Response Required)
- `APIServiceDown` - Main API is down
- `MPPMicroserviceDown` - Conversion service unavailable
- `RedisDown` - Cache/queue unavailable

#### High (Response within 15 minutes)
- `QueueBacklogHigh` - >100 jobs waiting 5+ minutes
- `QueueFailedJobsIncreasing` - >10 failures in 15 minutes
- `ConversionFailureRateHigh` - >20% failure rate
- `StripeWebhookFailures` - >5 failures in 10 minutes
- `HighAutoRefundRate` - >10 auto-refunds per hour
- `NodeJSHeapNearLimit` - Heap >85%

#### Medium (Response within 1 hour)
- `APIHighLatency` - p95 >2s
- `ConversionSlowProcessing` - p95 >60s
- `RedisHighLatency` - >100ms
- `StripeWebhookStale` - No webhooks in 10 minutes
- `PendingRefundsHigh` - >20 pending refunds
- `HighMemoryUsage` - >1.5GB

#### Low (Business Metrics)
- `LowConversionVolume` - <1 conversion in 2h
- `NoActiveUsers` - No activity in 6h

### Configuring Alertmanager

```yaml
# alertmanager.yml example
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: high
      receiver: 'slack-ops'
    - match:
        severity: medium
      receiver: 'email'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@example.com'
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<key>'
  - name: 'slack-ops'
    slack_configs:
      - api_url: '<webhook-url>'
        channel: '#ops-alerts'
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Node.js dependencies (already included)
npm install prom-client

# For Java microservice (pom.xml already updated)
cd microservices/mpp-converter
mvn clean install
```

### 2. Start Services

```bash
# Start API (port 3001)
cd api && node server-enterprise.js

# Start Worker
node queue/worker.js

# Start MPP Microservice (port 8080)
cd microservices/mpp-converter
java -jar target/mpp-converter.jar

# Start Prometheus (port 9090)
prometheus --config.file=prometheus/prometheus.yml

# Start Grafana (port 3000)
docker run -d -p 3000:3000 grafana/grafana
```

### 3. Verify Metrics

```bash
# Test metrics endpoints
node scripts/test-metrics.js

# Validate alert rules
node scripts/test-alerts.js
```

### 4. Configure Prometheus

Update `prometheus/prometheus.yml` with your hosts:

```yaml
scrape_configs:
  - job_name: 'cannaconverter-api'
    static_configs:
      - targets: ['your-api-host:3001']
```

### 5. Import Dashboards

Follow the "Importing Dashboards" section above.

## Docker Compose Setup

For production, use docker-compose:

```yaml
# docker-compose.observability.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus:/etc/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - ./grafana:/var/lib/grafana/dashboards
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    ports:
      - "9093:9093"
```

## Operational Runbooks

### Alert: APIServiceDown

1. Check if process is running: `systemctl status cannaconverter-api`
2. Check logs: `journalctl -u cannaconverter-api -n 100`
3. Check port availability: `netstat -tlnp | grep 3001`
4. Restart if needed: `systemctl restart cannaconverter-api`
5. If persists, check memory/disk usage

### Alert: QueueBacklogHigh

1. Check queue status: `curl localhost:3001/api/health/detailed`
2. Verify workers are running
3. Check for stuck jobs in Redis
4. Scale workers if needed
5. Check MPP microservice health

### Alert: StripeWebhookFailures

1. Check Stripe Dashboard for webhook delivery status
2. Verify webhook endpoint is accessible
3. Check signature verification in logs
4. Verify STRIPE_WEBHOOK_SECRET is correct
5. Check for network/firewall issues

### Alert: HighMemoryUsage

1. Check for memory leaks in logs
2. Review recent deployments
3. Check for large file uploads
4. Consider restarting with increased heap
5. Review application for optimization

## Best Practices

### For Development

1. Run `test-metrics.js` after changes to metrics code
2. Use labels consistently across metrics
3. Document new metrics in this file
4. Test dashboards with sample data

### For Production

1. Set appropriate scrape intervals (10-15s recommended)
2. Configure retention policies in Prometheus
3. Set up dashboard alerts in Grafana
4. Regularly review and tune alert thresholds
5. Keep dashboards focused and organized

## Files Reference

```
├── api/
│   └── lib/
│       ├── metrics.js        # Prometheus metrics library
│       └── health.js         # Health check functions
├── queue/
│   └── monitor.js            # BullMQ queue monitoring
├── grafana/
│   ├── dashboard_workers.json
│   ├── dashboard_stripe.json
│   ├── dashboard_converters.json
│   └── dashboard_infra.json
├── prometheus/
│   ├── prometheus.yml        # Prometheus config
│   └── alerts.yml            # Alert rules
├── scripts/
│   ├── test-metrics.js       # Metrics validation
│   └── test-alerts.js        # Alerts validation
└── OBSERVABILITY.md          # This file
```

## Changelog

- **v1.0.0** - Initial observability implementation
  - Prometheus metrics for API, Worker, Queue
  - Spring Actuator for Java microservice
  - 4 Grafana dashboards
  - 15+ alert rules
  - Test scripts and documentation
