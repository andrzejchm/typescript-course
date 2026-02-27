# 17 — Cloud & GCP Fundamentals

As a mobile developer, you've always deployed by shipping a binary to the App Store or Google Play. Someone else's infrastructure (Apple, Google) handles distribution, scaling, and uptime. Cloud deployment flips that model: you rent compute, storage, and networking from a provider and you're responsible for keeping your services running. This lesson covers what you need to know to deploy a real Next.js + NestJS + BullMQ worker stack on Google Cloud Platform.

---

## 1) What "The Cloud" Actually Is

Mental model: you're renting someone else's computers. That's it. The rest is layers of abstraction on top.

Compare deployment models you already know:

| Model | You ship... | Who runs it? | You manage... |
|---|---|---|---|
| App Store | `.ipa` / `.aab` binary | Apple / Google | Nothing (runtime is the user's phone) |
| Firebase | Functions + config | Google | Almost nothing (managed everything) |
| GCP | Container / VM config | Google (hardware) + you (software) | OS, runtime, networking, scaling |

Key concepts:

- **Regions and zones**: A region is a geographic area (e.g., `europe-central2` = Warsaw). Each region has multiple zones (independent data centers). Pick the region closest to your users.
- **On-demand vs reserved**: Pay by the hour/second for what you use, or commit to 1-3 years for discounts.
- **Pay-per-use**: No upfront hardware cost. You pay for CPU-hours, GB stored, GB transferred.

Flutter analogy: Firebase is like using pre-built Flutter widgets — fast to ship, limited customization. GCP is like building custom `RenderObject`s — more control, more responsibility, more footguns.

---

## 2) GCP Project Structure & Billing

A GCP **project** is the fundamental isolation boundary. Every resource (VM, database, bucket) lives inside a project. Think of it like a separate Firebase project — its own billing, its own IAM, its own resource namespace.

Resource hierarchy:

```
Organization (your company)
  └── Folder (optional grouping, e.g., "production", "staging")
      └── Project (ooh-manager-prod)
          ├── Compute Engine instances
          ├── Cloud SQL instances
          ├── Cloud Storage buckets
          └── ...
```

**Billing**: Each project is linked to a billing account. Set budget alerts immediately — a misconfigured VM or runaway query can burn money fast.

```bash
# Install
brew install google-cloud-sdk

# Auth and project setup
gcloud auth login
gcloud config set project ooh-manager-prod
gcloud projects list

# Quick resource check
gcloud compute instances list
gcloud sql instances list
```

Cost control for small teams:

- Set budget alerts at 50%, 80%, 100% of your monthly budget
- Start with `e2-medium` or smaller — you can always scale up
- Use committed use discounts in Phase 3 when usage is predictable
- Monitor the billing dashboard weekly during early phases

---

## 3) IAM — Who Can Do What

Mental model: IAM is like Dart's access modifiers (`public`, `private`, `@protected`) but for cloud resources. Instead of controlling which classes can call a method, you control which identities can access which resources.

Core concepts:

- **Principals**: Who is making the request. Can be a user (`alice@company.com`), a service account (`ooh-api@project.iam.gserviceaccount.com`), or a group.
- **Roles**: A collection of permissions. Predefined roles like `roles/cloudsql.client` or `roles/storage.objectViewer` cover common patterns.
- **Policy bindings**: The glue — "this principal has this role on this resource."
- **Service accounts**: Non-human identities. Your API server, worker, and CI pipeline each get their own.

**Least privilege principle**: Grant the minimum permissions needed. Don't give your API server `roles/owner` just because it's easier.

Production pattern — each service gets its own service account:

```bash
# Create service account for API service
gcloud iam service-accounts create ooh-api \
  --display-name="OOH Manager API"

# Grant only what it needs
gcloud projects add-iam-policy-binding ooh-manager-prod \
  --member="serviceAccount:ooh-api@ooh-manager-prod.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Separate service account for the worker
gcloud iam service-accounts create ooh-worker \
  --display-name="OOH Manager Worker"

gcloud projects add-iam-policy-binding ooh-manager-prod \
  --member="serviceAccount:ooh-worker@ooh-manager-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

Pitfall: Using your personal Google account credentials in production code. Always use service accounts for application auth.

---

## 4) Compute Engine — Your Phase 1 VM

What it is: a virtual machine you SSH into. Like running your app on your Mac, but it's in Google's data center with a public IP.

Key concepts:

- **Machine types**: `e2-medium` (2 vCPU, 4GB RAM) is a solid Phase 1 starting point. Enough for Docker Compose running web + api + worker + postgres + redis.
- **Boot disk**: The OS image. Ubuntu 24.04 LTS is a safe default.
- **Persistent disks**: Storage that survives VM restarts. Your boot disk is one; you can attach additional disks.
- **Startup scripts**: Shell scripts that run on every boot — useful for pulling latest Docker images.
- **Firewall rules**: Control which ports are open. Tags like `http-server` and `https-server` open 80/443.
- **Static external IP**: Reserve one so your DNS doesn't break when the VM restarts.

Full Phase 1 setup:

```bash
# Create a VM
gcloud compute instances create ooh-prod-vm \
  --zone=europe-central2-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server

# Reserve a static IP
gcloud compute addresses create ooh-prod-ip \
  --region=europe-central2

# Attach it to the VM
gcloud compute instances delete-access-config ooh-prod-vm \
  --zone=europe-central2-a \
  --access-config-name="external-nat"
gcloud compute instances add-access-config ooh-prod-vm \
  --zone=europe-central2-a \
  --address=$(gcloud compute addresses describe ooh-prod-ip --region=europe-central2 --format='value(address)')

# SSH into it
gcloud compute ssh ooh-prod-vm --zone=europe-central2-a

# Then on the VM: install Docker, docker compose, pull your images, run
```

Phase 1 architecture — everything on one VM:

```
┌─────────────────────────────────────────┐
│  Compute Engine VM (e2-medium)          │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌────────┐  │
│  │  Next.js │  │ NestJS  │  │ Worker │  │
│  │  (web)   │  │ (api)   │  │(BullMQ)│  │
│  └────┬─────┘  └────┬────┘  └───┬────┘  │
│       │              │           │       │
│  ┌────┴──────────────┴───────────┴────┐  │
│  │         Docker Compose             │  │
│  ├──────────────┬─────────────────────┤  │
│  │  PostgreSQL  │       Redis         │  │
│  └──────────────┴─────────────────────┘  │
└─────────────────────────────────────────┘
         │
         ▼
   Cloud Storage (backups, assets)
```

Pitfalls:

- **Single point of failure**: VM goes down, everything goes down. Acceptable for a pilot with <50 users.
- **Reboots**: GCE VMs can be live-migrated for maintenance, but plan for restarts. Use `restart-policy: always` in Docker Compose.
- **Disk full**: Docker images, logs, and postgres WAL files accumulate. Monitor disk usage.
- **OOM kills**: If your services exceed 4GB RAM, the kernel kills processes. Monitor memory.

---

## 5) Cloud Storage — Object Storage for Everything

Mental model: like a hard drive in the cloud with an HTTP API. But it's not a file system — it's a flat key-value store where keys look like file paths.

```
gs://ooh-manager-assets/campaigns/123/photo.jpg
                        ^^^^^^^^^^^^^^^^^^^^^^^^
                        This is the object key (not a directory path)
```

Core concepts:

- **Buckets**: Top-level containers. Globally unique names. One bucket per concern (assets, backups, exports).
- **Objects**: The actual files. Immutable — you replace, not edit.
- **Storage classes**: Mapped to access frequency:
  - **Standard**: Frequently accessed (media assets, exports). ~$0.02/GB/month.
  - **Nearline**: Accessed less than once per month (recent backups). ~$0.01/GB/month.
  - **Coldline**: Accessed less than once per quarter. ~$0.004/GB/month.
  - **Archive**: Accessed less than once per year. ~$0.0012/GB/month.
- **Lifecycle rules**: Automatically transition or delete objects based on age.
- **Signed URLs**: Temporary, pre-authenticated URLs for secure access without exposing credentials.

Use cases in OOH Manager:

1. **Media photos/assets** (Standard class) — campaign billboard photos
2. **Generated exports** (Standard) — PDFs, Excel, PPTX reports
3. **Database backup archives** (Nearline → Coldline after 30 days)

```typescript
export {};

import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const bucket = storage.bucket("ooh-manager-assets");

// Upload a file
async function uploadAsset(
  filePath: string,
  destination: string,
): Promise<void> {
  await bucket.upload(filePath, { destination });
}

// Generate signed URL for temporary access (e.g., client viewing a photo)
async function getSignedUrl(objectPath: string): Promise<string> {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
  return url;
}

// Delete an object
async function deleteAsset(objectPath: string): Promise<void> {
  await bucket.file(objectPath).delete();
}
```

```bash
# CLI basics
gsutil mb -l europe-central2 gs://ooh-manager-assets
gsutil mb -l europe-central2 gs://ooh-manager-backups

gsutil cp ./backup.sql.gz gs://ooh-manager-backups/daily/
gsutil ls gs://ooh-manager-assets/

# Set lifecycle rule: delete backups older than 90 days
# (lifecycle.json)
# {
#   "rule": [{
#     "action": {"type": "Delete"},
#     "condition": {"age": 90}
#   }]
# }
gsutil lifecycle set lifecycle.json gs://ooh-manager-backups
```

CORS config for browser uploads (needed if your Next.js frontend uploads directly):

```json
[
  {
    "origin": ["https://app.oohmanager.com"],
    "method": ["PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gsutil cors set cors.json gs://ooh-manager-assets
```

---

## 6) Cloud SQL — Managed PostgreSQL (Phase 2)

What it is: Google runs PostgreSQL for you. No more managing postgres in Docker on your VM. You get a connection string and a managed service that handles backups, patches, and failover.

Why migrate from VM Postgres:

| Concern | VM Postgres | Cloud SQL |
|---|---|---|
| Backups | Manual `pg_dump` cron | Automated daily + PITR |
| Recovery Point Objective | 24 hours (last backup) | Minutes (PITR) |
| OS/Postgres patches | You do it | Google does it |
| HA failover | Not available | One toggle (Phase 3) |
| Connection pooling | You set up PgBouncer | Built-in |
| PostGIS | You install it | Supported, you enable it |

```bash
# Create instance
gcloud sql instances create ooh-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-8192 \
  --region=europe-central2 \
  --storage-size=20GB \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery

# Create database
gcloud sql databases create ooh_manager --instance=ooh-db

# Create user
gcloud sql users create ooh_app \
  --instance=ooh-db \
  --password=<use-a-secret-manager>

# Enable PostGIS (connect first, then run SQL)
# CREATE EXTENSION postgis;
```

Connecting from your app — use Cloud SQL Auth Proxy:

```bash
# Cloud SQL Auth Proxy runs alongside your app as a sidecar
cloud-sql-proxy ooh-manager-prod:europe-central2:ooh-db &

# Your app connects to localhost:5432 as if postgres is local
# DATABASE_URL=postgresql://ooh_app:password@localhost:5432/ooh_manager
```

Flutter analogy: Cloud SQL Auth Proxy is like a local dev server proxy in Flutter web — it handles the connection complexity so your app code stays simple.

Pitfall: Cloud SQL costs more than VM postgres. Budget ~$50-80/month for a `db-custom-2-8192` instance (2 vCPU, 8GB RAM). Worth it for the operational savings once you have real users.

---

## 7) Memorystore — Managed Redis (Phase 2+)

Same idea as Cloud SQL but for Redis. Google handles replication, patching, and failover.

- **Standard tier**: Single node. Fine for Phase 2 pilot.
- **HA tier**: Primary + replica with automatic failover. Use in Phase 3.
- **Private IP only**: Must be in the same VPC as your Compute Engine VMs. Not accessible from the public internet.

Used for:

1. **BullMQ job queues** — your worker processes jobs from Redis queues
2. **Caching** — API response caching, session data
3. **Rate limiting** — sliding window counters

```bash
gcloud redis instances create ooh-cache \
  --size=1 \
  --region=europe-central2 \
  --redis-version=redis_7_2 \
  --tier=standard

# Get the IP to configure your app
gcloud redis instances describe ooh-cache --region=europe-central2 \
  --format='value(host)'
```

Your app connects using the private IP:

```typescript
export {};

import { Redis } from "ioredis";

// Memorystore private IP — no auth needed within VPC
const redis = new Redis({
  host: "10.0.0.3", // private IP from gcloud redis instances describe
  port: 6379,
});
```

---

## 8) Load Balancing & CDN (Phase 3)

When you scale beyond one VM, you need to distribute traffic. GCP's HTTP(S) Load Balancer is the entry point.

What you get:

- **Traffic distribution** across multiple VM instances (or instance groups)
- **Managed SSL certificates** — free, auto-renewed Let's Encrypt certs
- **Cloud CDN** — caches static assets at Google's edge locations worldwide
- **Cloud Armor (WAF)** — DDoS protection, bot mitigation, IP allowlisting
- **Health checks** — automatically removes unhealthy backends

Mental model: The Load Balancer is like a `GoRouter` that routes incoming HTTP requests to different backend instances based on URL path and health status.

Phase 3 architecture:

```
Internet
    │
    ▼
Cloud Armor (WAF)
    │
    ▼
HTTP(S) Load Balancer
    │
    ├── /app/*  ──→  [VM1: Next.js, VM2: Next.js]
    │
    ├── /api/*  ──→  [VM3: NestJS, VM4: NestJS]
    │
    └── (internal)
            │
            ├──→  Cloud SQL (private IP, HA)
            ├──→  Memorystore Redis (private IP, HA)
            └──→  [VM5: Worker, VM6: Worker]
```

Workers don't sit behind the load balancer — they pull jobs from Redis queues. You scale workers by monitoring queue lag: if jobs are backing up, add more worker instances.

---

## 9) Cloud Logging & Monitoring

GCP automatically ingests logs from Compute Engine, Cloud SQL, and other services. You don't need to set up a separate logging stack in Phase 1.

- **Cloud Logging**: Centralized log viewer. Filter by resource, severity, time range.
- **Cloud Monitoring**: Dashboards, uptime checks, alerting policies.
- **Log-based metrics**: Create custom metrics from log patterns (e.g., count of `500` errors).
- **Uptime checks**: Ping your endpoints every 1-10 minutes, alert on failure.
- **Integration with OpenTelemetry**: Your structured logs and traces from lesson 11 flow into Cloud Logging/Trace automatically with the right exporter.

```bash
# View recent logs from your VM
gcloud logging read "resource.type=gce_instance" --limit=50 --format=json

# View Cloud SQL logs
gcloud logging read "resource.type=cloudsql_database" --limit=20

# Create an uptime check
gcloud monitoring uptime create ooh-api-health \
  --display-name="API Health Check" \
  --uri=https://api.oohmanager.com/health \
  --check-interval=60s
```

Set up alerting early — at minimum:

1. **Uptime check failure** → alert on 2 consecutive failures
2. **VM CPU > 80% for 5 minutes** → potential scaling need
3. **Disk usage > 85%** → clean up before it's too late
4. **Cloud SQL connections > 80% of max** → connection pool issue

---

## 10) Backup Strategy Across Phases

**Phase 1**: `pg_dump` daily → Cloud Storage

```bash
#!/bin/bash
# backup.sh — runs via cron on the VM
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/backup_${TIMESTAMP}.sql.gz"

pg_dump -h localhost -U ooh_app ooh_manager | gzip > "${BACKUP_FILE}"
gsutil cp "${BACKUP_FILE}" "gs://ooh-manager-backups/daily/"
rm "${BACKUP_FILE}"

echo "Backup completed: backup_${TIMESTAMP}.sql.gz"

# Add to crontab:
# 0 3 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

Test your restores regularly. A backup you've never restored is not a backup.

```bash
# Restore test
gsutil cp gs://ooh-manager-backups/daily/backup_20260227_030000.sql.gz /tmp/
gunzip /tmp/backup_20260227_030000.sql.gz
psql -h localhost -U ooh_app -d ooh_manager_restore < /tmp/backup_20260227_030000.sql
```

**Phase 2**: Cloud SQL automated backups + PITR. Recovery point drops from 24 hours to minutes. You can restore to any point in time within the retention window (default 7 days).

**Phase 3**: WAL archiving, cross-region backup replication, scheduled restore drills (quarterly).

---

## 11) Cost Reality Check

Realistic monthly cost breakdown for each phase:

### Phase 1 — Single VM (~$30-35/month)

| Resource | Cost |
|---|---|
| e2-medium VM (2 vCPU, 4GB) | ~$25/month |
| 50GB persistent disk (SSD) | ~$5/month |
| Cloud Storage (50GB Standard) | ~$1/month |
| Static IP (free when attached) | ~$0/month |
| Egress (first 200GB free) | ~$0/month |
| **Total** | **~$30-35/month** |

### Phase 2 — Managed Services (~$130-150/month)

| Resource | Cost |
|---|---|
| e2-medium VM | ~$25/month |
| Cloud SQL (db-custom-2-8192) | ~$60-80/month |
| Memorystore (1GB Standard) | ~$35/month |
| Cloud Storage | ~$1/month |
| Static IP | ~$0/month |
| **Total** | **~$130-150/month** |

### Phase 3 — HA Production (~$400-600/month)

| Resource | Cost |
|---|---|
| 2-4 VMs behind load balancer | ~$50-100/month |
| Cloud SQL HA | ~$120-160/month |
| Memorystore HA | ~$70/month |
| Load Balancer + Cloud Armor | ~$30-50/month |
| Cloud Storage + CDN | ~$10-20/month |
| Monitoring/Logging (beyond free tier) | ~$10-20/month |
| **Total** | **~$400-600/month** |

These are estimates for a small-to-medium B2B SaaS. Your actual costs depend on traffic, storage, and data transfer.

---

## 12) Pitfalls & Gotchas

**Billing**:
- Forgetting to set budget alerts. A misconfigured load test or runaway process can generate a surprise bill.
- Leaving resources running in forgotten projects. Audit monthly.

**Security**:
- Public IPs on databases. Always use private IPs + VPC for Cloud SQL and Memorystore.
- Using your personal Google account for application auth. Use service accounts.
- Overly permissive IAM roles. `roles/owner` on a service account is never the answer.

**Operations**:
- Running VM in the wrong region. If your users are in Poland, don't deploy to `us-central1`.
- Disk full on VM. Docker images, container logs, and postgres WAL files accumulate silently. Set up disk usage alerts.
- Cloud SQL connection limits. Default is 100 connections. Use connection pooling (PgBouncer or built-in) and don't open a new connection per request.
- Not testing backups. Run a restore drill before you need it in an emergency.

**Networking**:
- Forgetting firewall rules. Your VM won't serve traffic on port 443 unless you allow it.
- Not setting up HTTPS. Use managed SSL certificates — there's no excuse for HTTP in production.

---

## 13) Practice Tasks

1. **Create a GCP project**, link a billing account, set a $50 budget alert with email notifications at 50%, 80%, and 100%.

2. **Spin up an e2-micro VM** (free tier eligible), SSH into it, install Docker and Docker Compose. Run a simple `nginx` container and verify it serves traffic on port 80.

3. **Create a Cloud Storage bucket**, upload a file via `gsutil`, then write a TypeScript script using `@google-cloud/storage` that uploads and downloads a file.

4. **Set up a service account** with `roles/storage.objectViewer` only. Generate a key, use it in your TypeScript script, and verify it can read but not write.

5. **Write a backup script** that `pg_dump`s a local Postgres database, compresses it with `gzip`, uploads to a GCS bucket, and cleans up the local file. Add it to crontab.

---

**Previous:** [16-nestjs.md](./16-nestjs.md) - NestJS
**Next:** [18-infrastructure-as-code.md](./18-infrastructure-as-code.md) - Infrastructure as Code
