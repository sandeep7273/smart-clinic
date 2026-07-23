# Performance, Scalability, and SLA Evidence

This document records the evidence required for the capstone non-functional requirements: sub-second read/search latency, millions-of-record scalability, and 99.9% availability.

## Evidence Artifacts

| Claim                          | Evidence source                                                                                                | Pass criteria                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Sub-second search/read latency | `performance/k6/smartclinic-load-test.js` and GitHub Actions workflow `Performance - Load Test`                | `http_req_duration p95 < 1000ms`, `doctor_search_latency_ms p95 < 1000ms`, failure rate `< 1%`  |
| Millions-of-record scalability | MongoDB indexes/read models plus repeatable load test against seeded or production-like data                   | Search p95 remains `< 1000ms` at target data volume; DB CPU/memory remain below alarm threshold |
| 99.9% availability             | ECS min task counts, Fargate multi-AZ private subnets, ALB health checks, CloudWatch alarms, and weekly k6 run | Monthly uptime `>= 99.9%`; health endpoint failure rate `< 0.1%`                                |

## How to Run the Load Test Locally

Install k6, then run:

```bash
BASE_URL=http://localhost:3000 \
AUTH_TOKEN=<jwt-token-if-needed> \
VUS=20 \
DURATION=2m \
k6 run performance/k6/smartclinic-load-test.js
```

For a deployed environment:

```bash
BASE_URL=https://<api-gateway-or-alb-domain> \
AUTH_TOKEN=<jwt-token> \
VUS=100 \
DURATION=10m \
k6 run performance/k6/smartclinic-load-test.js
```

## GitHub Actions Evidence

Use `.github/workflows/performance-load-test.yml` manually with:

- `base_url`: deployed API Gateway or ALB URL
- `vus`: virtual users for the run
- `duration`: run duration
- `PERFORMANCE_AUTH_TOKEN`: GitHub secret containing a test user JWT when GraphQL auth is enabled
- `PERFORMANCE_BASE_URL`: optional repository variable for scheduled weekly runs

The workflow fails when latency or failure-rate thresholds are not met, creating repeatable evidence for the capstone report.

## Scalability Evidence Plan

1. Seed a production-like doctor dataset with at least the target record count.
2. Confirm indexes are present for search fields: specialization, city, treated conditions, treated symptoms, status, availability, and rating.
3. Run the k6 workflow at increasing load levels: 20, 100, 250, and 500 virtual users.
4. Capture CloudWatch metrics for ECS CPU, ECS memory, ALB latency, MongoDB Atlas query latency, Redis CPU, and Redis evictions.
5. Attach the GitHub Actions run URL and CloudWatch dashboard screenshots to the final capstone submission.

## SLA Evidence Plan

99.9% monthly uptime allows about 43.8 minutes of downtime per 30-day month.

The project supports this target with:

- ECS/Fargate services deployed across private subnets in multiple availability zones.
- ECS service auto-scaling for CPU and memory pressure.
- ALB target health checks and ECS container health checks.
- Deployment circuit breakers with rollback.
- CloudWatch alarms for high CPU, high memory, ALB 4xx/5xx, p99 latency, Redis pressure, and unhealthy tasks.
- Scheduled k6 health/search checks through GitHub Actions.

Operational evidence should be collected from CloudWatch alarm history, ALB target group health, and weekly k6 workflow runs.
