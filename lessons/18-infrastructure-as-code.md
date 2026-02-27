# 18 — Infrastructure as Code

Clicking around in GCP Console works for a quick experiment. It does not work when you need to recreate the same setup for staging, hand it to a teammate, or recover after a misconfiguration at 2 AM. Infrastructure as Code (IaC) means your infrastructure is defined in version-controlled files, reviewed in PRs, and applied deterministically — the same way every time.

---

## 1) Why Infrastructure as Code

The problem: you set up your VM, Cloud SQL, Storage buckets, firewall rules, and IAM bindings manually in the Console. Three months later:

- You can't remember what you configured or why
- A teammate can't replicate it
- You need a staging environment identical to prod — good luck clicking through 47 screens again
- Something breaks and you have no audit trail of what changed

Flutter analogy: IaC is like having a `pubspec.yaml` + build scripts for your infrastructure. Instead of manually installing packages, configuring Xcode signing, and editing `Info.plist` by hand, you declare what you want and a tool makes it happen. `flutter create` gives you a reproducible project. IaC gives you a reproducible cloud environment.

### Three approaches compared

| Approach | Example | Reproducible? | Reviewable? | Scalable? |
|---|---|---|---|---|
| ClickOps (Console UI) | GCP Console | ❌ | ❌ | ❌ |
| Scripts (imperative) | bash + `gcloud` CLI | Somewhat | Somewhat | Fragile |
| IaC (declarative) | Terraform / Pulumi | ✅ | ✅ | ✅ |

**ClickOps** is fine for exploration. **Scripts** break when resources already exist or when order matters. **Declarative IaC** describes the desired end state and the tool figures out how to get there — create, update, or delete.

---

## 2) Terraform / OpenTofu — The Industry Standard

### What it is

- You write `.tf` files declaring what resources should exist
- Terraform computes the diff between current state and desired state
- It creates, updates, or deletes resources to match
- OpenTofu is the open-source fork (same syntax, same concepts, no licensing concerns)

### HCL basics

HCL (HashiCorp Configuration Language) is a simple declarative DSL. Not a general-purpose language — intentionally limited.

```hcl
# main.tf — the entry point

terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "ooh-manager-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

What's happening:

- `terraform` block pins the Terraform version and declares which providers (cloud plugins) you need
- `backend "gcs"` stores state remotely in a GCS bucket (more on state later)
- `provider "google"` configures the GCP plugin with your project and region
- `var.project_id` references a variable — defined elsewhere, injected at runtime

### Core concepts with Flutter analogies

| Terraform concept | What it does | Flutter analogy |
|---|---|---|
| Provider | Plugin that talks to a cloud API | Package in `pubspec.yaml` |
| Resource | A thing that exists (VM, database, bucket) | A Widget in the tree |
| Data source | Read-only reference to existing resource | `InheritedWidget` lookup |
| Variable | Input parameter | Constructor parameter |
| Output | Exported value after apply | A widget's public getter |
| State | Record of what Terraform has created | `build()` output cached by the framework |
| Module | Reusable group of resources | Reusable Widget class |

### The workflow

```bash
terraform init      # Download providers (like `pub get`)
terraform plan      # Show what would change (dry-run diff)
terraform apply     # Execute the changes
terraform destroy   # Tear everything down
```

`terraform plan` is the most important command. It shows you exactly what will be created, changed, or destroyed before anything happens:

```text
Terraform will perform the following actions:

  # google_compute_instance.app will be created
  + resource "google_compute_instance" "app" {
      + machine_type = "e2-medium"
      + name         = "ooh-prod"
      + zone         = "europe-central2-a"
      + ...
    }

  # google_storage_bucket.assets will be updated in-place
  ~ resource "google_storage_bucket" "assets" {
      ~ storage_class = "STANDARD" -> "NEARLINE"
    }

  # google_compute_firewall.old_rule will be destroyed
  - resource "google_compute_firewall" "old_rule" {
      - name = "old-rule"
      - ...
    }

Plan: 1 to add, 1 to change, 1 to destroy.
```

Read it like a git diff: `+` = create, `~` = modify, `-` = destroy. **Always review the plan before applying.** If you see an unexpected `destroy`, stop and investigate.

---

## 3) Provisioning the OOH Manager Stack

### Phase 1 resources

This is the full Terraform config for Phase 1: single VM with Docker Compose, Cloud Storage for assets and backups.

```hcl
# variables.tf
variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type    = string
  default = "europe-central2"
}

variable "zone" {
  type    = string
  default = "europe-central2-a"
}
```

```hcl
# network.tf — VPC and firewall rules

resource "google_compute_network" "main" {
  name                    = "ooh-network"
  auto_create_subnetworks = true
}

resource "google_compute_firewall" "allow_http_https" {
  name    = "allow-http-https"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Restrict SSH to your IP only — never 0.0.0.0/0
  source_ranges = ["YOUR_IP/32"]
  target_tags   = ["ssh-server"]
}
```

```hcl
# vm.tf — Phase 1 Compute Engine instance

resource "google_compute_address" "static_ip" {
  name   = "ooh-prod-ip"
  region = var.region
}

resource "google_compute_instance" "app" {
  name         = "ooh-prod"
  machine_type = "e2-medium"
  zone         = var.zone
  tags         = ["http-server", "ssh-server"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = 50
    }
  }

  network_interface {
    network = google_compute_network.main.name
    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  metadata_startup_script = file("scripts/vm-startup.sh")

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }
}
```

Notice how resources reference each other: `google_compute_network.main.name` in the firewall, `google_compute_address.static_ip.address` in the VM. Terraform builds a dependency graph and creates resources in the right order automatically. Like Flutter's widget tree — children reference parents, the framework handles the build order.

```hcl
# storage.tf — Cloud Storage buckets

resource "google_storage_bucket" "assets" {
  name          = "${var.project_id}-assets"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  cors {
    origin          = ["https://oohmanager.com"]
    method          = ["GET", "PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-backups"
  location      = var.region
  storage_class = "NEARLINE"

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}
```

```hcl
# iam.tf — Service accounts and permissions

resource "google_service_account" "app" {
  account_id   = "ooh-app"
  display_name = "OOH Manager App"
}

resource "google_storage_bucket_iam_member" "app_assets" {
  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}

resource "google_storage_bucket_iam_member" "app_backups" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.app.email}"
}
```

Note the principle of least privilege: the app gets `objectAdmin` on assets (read + write + delete) but only `objectCreator` on backups (write-only — it shouldn't delete backups).

```hcl
# outputs.tf — values available after apply

output "vm_ip" {
  value       = google_compute_address.static_ip.address
  description = "Public IP of the production VM"
}

output "assets_bucket" {
  value       = google_storage_bucket.assets.name
  description = "Name of the assets storage bucket"
}
```

Outputs are printed after `terraform apply` and can be queried with `terraform output vm_ip`. Useful for feeding values into deployment scripts or other Terraform configs.

### Phase 2 additions — Cloud SQL + Memorystore

When you move off the single-VM Docker Compose setup to managed services:

```hcl
# cloudsql.tf

resource "google_sql_database_instance" "main" {
  name             = "ooh-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-2-8192"  # 2 vCPU, 8 GB RAM
    availability_type = "ZONAL"             # Change to REGIONAL for Phase 3 HA

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false                        # No public IP
      private_network = google_compute_network.main.id
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = true  # Prevents accidental terraform destroy
}

resource "google_sql_database" "app" {
  name     = "ooh_manager"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "ooh_app"
  instance = google_sql_database_instance.main.name
  password = var.db_password  # Never hardcode — see Secrets section
}
```

```hcl
# memorystore.tf

resource "google_redis_instance" "main" {
  name           = "ooh-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = var.region
  redis_version  = "REDIS_7_2"

  authorized_network = google_compute_network.main.id
}
```

Key decisions in this config:

- **`ipv4_enabled = false`** on Cloud SQL — no public IP, only accessible from within the VPC
- **`deletion_protection = true`** — Terraform will refuse to destroy this resource until you explicitly set it to `false`
- **`STANDARD_HA`** on Redis — automatic failover to a replica

---

## 4) State Management

State is Terraform's memory of what it has created. It's a JSON file that maps your `.tf` resource declarations to real cloud resource IDs.

### Why state matters

Without state, Terraform doesn't know that `google_compute_instance.app` corresponds to the VM with ID `1234567890` in your GCP project. It would try to create a duplicate every time you run `apply`.

### Local vs remote state

| | Local state | Remote state (GCS) |
|---|---|---|
| File | `terraform.tfstate` on your machine | `gs://bucket/terraform.tfstate` |
| Team-safe | ❌ Two people can corrupt it | ✅ Locking prevents conflicts |
| Backup | ❌ Laptop dies, state is gone | ✅ GCS versioning |
| CI/CD | ❌ State not available in pipeline | ✅ Accessible from anywhere |

**Always use remote state for anything beyond personal experiments.**

### Setting up remote state

```bash
# Create the state bucket ONCE (manually or with a bootstrap script)
gsutil mb -l europe-central2 gs://ooh-manager-tfstate
gsutil versioning set on gs://ooh-manager-tfstate
```

Then reference it in your `terraform` block (shown in section 2).

### State locking

When you run `terraform apply`, Terraform acquires a lock on the state file. If a teammate runs `apply` at the same time, they get an error instead of corrupting the state. GCS backend handles this automatically.

### Inspecting state

```bash
terraform state list                              # List all managed resources
terraform state show google_compute_instance.app  # Show details of one resource
```

### The golden rule

If you lose your state file, Terraform doesn't know about your existing resources. It will try to create duplicates and fail on naming conflicts. **Always back up state.** GCS versioning is your safety net.

---

## 5) Modules — Reusable Infrastructure

Modules are Terraform's equivalent of extracting a reusable Widget class in Flutter. Instead of copy-pasting resource blocks between environments, you define them once and parameterize.

### Project structure

```text
infra/
├── modules/
│   ├── compute/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── storage/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── prod/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── staging/
│       ├── main.tf
│       └── terraform.tfvars
```

### Defining a module

```hcl
# modules/storage/variables.tf
variable "bucket_name" {
  type = string
}

variable "location" {
  type = string
}

variable "storage_class" {
  type    = string
  default = "STANDARD"
}

variable "lifecycle_age_days" {
  type    = number
  default = 0  # 0 = no lifecycle rule
}
```

```hcl
# modules/storage/main.tf
resource "google_storage_bucket" "this" {
  name          = var.bucket_name
  location      = var.location
  storage_class = var.storage_class

  uniform_bucket_level_access = true

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_age_days > 0 ? [1] : []
    content {
      condition {
        age = var.lifecycle_age_days
      }
      action {
        type = "Delete"
      }
    }
  }
}
```

```hcl
# modules/storage/outputs.tf
output "bucket_name" {
  value = google_storage_bucket.this.name
}

output "bucket_url" {
  value = google_storage_bucket.this.url
}
```

### Calling the module from different environments

```hcl
# environments/prod/main.tf
module "assets" {
  source        = "../../modules/storage"
  bucket_name   = "ooh-prod-assets"
  location      = "europe-central2"
  storage_class = "STANDARD"
}

module "backups" {
  source             = "../../modules/storage"
  bucket_name        = "ooh-prod-backups"
  location           = "europe-central2"
  storage_class      = "NEARLINE"
  lifecycle_age_days = 90
}
```

```hcl
# environments/staging/main.tf
module "assets" {
  source        = "../../modules/storage"
  bucket_name   = "ooh-staging-assets"
  location      = "europe-central2"
  storage_class = "STANDARD"
}

# Staging doesn't need backups — just don't include the module
```

Same module, different parameters. Staging and prod stay consistent in structure but differ in configuration. Like using the same Widget class with different constructor arguments.

---

## 6) Secrets Handling

**Never put secrets in `.tf` files or commit them to git.** Terraform state also contains secret values in plaintext — another reason to secure your state bucket.

### Options from simplest to most secure

**1. `terraform.tfvars` (gitignored)**

```hcl
# terraform.tfvars — add to .gitignore
db_password = "super-secret-password"
```

Fine for local development. Not for CI/CD or shared environments.

**2. Environment variables**

```bash
export TF_VAR_db_password="super-secret-password"
terraform apply
```

Terraform automatically picks up `TF_VAR_<name>` environment variables. Good for CI/CD pipelines where you inject secrets from a vault.

**3. Google Secret Manager (recommended for production)**

```hcl
data "google_secret_manager_secret_version" "db_password" {
  secret = "ooh-db-password"
}

resource "google_sql_user" "app" {
  name     = "ooh_app"
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.db_password.secret_data
}
```

The secret lives in GCP, not in your code or state. Terraform reads it at apply time.

**4. Mark variables as sensitive**

```hcl
variable "db_password" {
  type      = string
  sensitive = true  # Redacted from plan output and logs
}
```

This doesn't encrypt the value — it just prevents Terraform from printing it in `plan` and `apply` output. Always combine with one of the above approaches.

---

## 7) CI/CD Integration

Terraform fits naturally into a PR-based workflow: plan on PRs, apply on merge to main.

```yaml
# .github/workflows/infra.yml
name: Infrastructure

on:
  push:
    branches: [main]
    paths: ['infra/**']
  pull_request:
    paths: ['infra/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9"

      - name: Terraform Init
        run: terraform init
        working-directory: infra/environments/prod

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=plan.tfplan
        working-directory: infra/environments/prod

      - name: Comment plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan\n\`\`\`\n${plan}\n\`\`\``
            });

  apply:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: plan
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub settings
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9"

      - name: Terraform Apply
        run: terraform init && terraform apply -auto-approve
        working-directory: infra/environments/prod
```

Key points:

- **`paths: ['infra/**']`** — only triggers when infrastructure files change, not on app code changes
- **Plan on PR** — reviewers see exactly what will change before approving
- **`environment: production`** — GitHub's environment protection rules can require manual approval before apply runs
- **`-auto-approve`** on main — safe because the plan was already reviewed in the PR

Flutter analogy: this is like having CI run `flutter analyze` and `flutter test` on PRs, but for your infrastructure. The plan output is your "test result."

---

## 8) Pulumi — The TypeScript Alternative

Pulumi does the same thing as Terraform but uses real programming languages instead of HCL. Since you're learning TypeScript, this is worth knowing.

```typescript
// index.ts — Pulumi equivalent of the Terraform VM config
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const region = config.get("region") || "europe-central2";

// Same VM, but it's TypeScript
const network = new gcp.compute.Network("ooh-network", {
  autoCreateSubnetworks: true,
});

const staticIp = new gcp.compute.Address("ooh-prod-ip", {
  region,
});

const vm = new gcp.compute.Instance("ooh-prod", {
  machineType: "e2-medium",
  zone: `${region}-a`,
  tags: ["http-server"],
  bootDisk: {
    initializeParams: {
      image: "ubuntu-os-cloud/ubuntu-2404-lts-amd64",
      size: 50,
    },
  },
  networkInterfaces: [{
    network: network.name,
    accessConfigs: [{
      natIp: staticIp.address,
    }],
  }],
});

// Real TypeScript logic — loops, conditionals, functions
const bucketConfigs = [
  { name: "assets", storageClass: "STANDARD" },
  { name: "backups", storageClass: "NEARLINE" },
  { name: "exports", storageClass: "STANDARD" },
];

const buckets = bucketConfigs.map(cfg =>
  new gcp.storage.Bucket(`ooh-${cfg.name}`, {
    location: region,
    storageClass: cfg.storageClass,
    uniformBucketLevelAccess: true,
  })
);

// Type-safe outputs
export const vmIp = staticIp.address;
export const bucketUrls = buckets.map(b => b.url);
```

The workflow is similar:

```bash
pulumi up       # Like terraform apply (shows preview first)
pulumi preview  # Like terraform plan
pulumi destroy  # Like terraform destroy
```

### Terraform vs Pulumi — when to choose which

| Factor | Terraform | Pulumi |
|---|---|---|
| Language | HCL (simple DSL) | TypeScript, Python, Go, C# |
| Learning curve | Learn HCL (small, purpose-built) | Use languages you already know |
| Community / docs | Massive, especially for GCP | Growing, good but smaller |
| Complex logic | Awkward (`for_each`, `count`, `dynamic` blocks) | Natural (loops, functions, classes) |
| State management | `terraform.tfstate` (self-managed or Terraform Cloud) | `pulumi.stack.json` (self-managed or Pulumi Cloud) |
| Testing | Limited (`terratest` in Go) | Standard unit tests (`vitest`, `jest`) |
| Industry adoption | De facto standard, more job-relevant | Growing in startups and TypeScript-heavy teams |
| Type safety | None (HCL is stringly-typed) | Full TypeScript type checking |
| IDE support | Basic (HCL extension) | Full TypeScript IntelliSense |

### When Pulumi shines

```typescript
// Dynamic infrastructure based on config — natural in TypeScript
const environments = ["staging", "prod"];
const services = ["web", "api", "worker"];

for (const env of environments) {
  for (const svc of services) {
    new gcp.compute.Instance(`${env}-${svc}`, {
      machineType: env === "prod" ? "e2-standard-4" : "e2-small",
      // ...
    });
  }
}
```

The equivalent in HCL requires `for_each` with `locals` and `flatten` — doable but ugly.

### Recommendation for OOH Manager

**Start with Terraform.** Reasons:

- More GCP examples and community answers available
- Simpler mental model for infrastructure (you don't need Turing-complete logic for 10-15 resources)
- Industry standard — more transferable knowledge
- HCL's limitations are actually a feature: infrastructure should be boring and predictable

Consider Pulumi if your infra grows complex enough to benefit from real programming constructs, or if your entire team is TypeScript-native and nobody wants to learn HCL.

---

## 9) Drift Detection

"Drift" = someone changed something manually in the Console that Terraform doesn't know about. Your `.tf` files say one thing, reality says another.

### Detecting drift

```bash
terraform plan
```

If the plan shows changes you didn't make in your `.tf` files, that's drift. Example:

```text
  # google_compute_instance.app will be updated in-place
  ~ resource "google_compute_instance" "app" {
      ~ machine_type = "e2-standard-2" -> "e2-medium"
        # (someone upgraded the VM in Console, Terraform wants to revert it)
    }
```

### Fixing drift

**Option 1: Overwrite the manual change** — run `terraform apply` to force reality back to match your code.

**Option 2: Update your code** — change the `.tf` file to match what was done manually, then `terraform plan` should show no changes.

**Option 3: Import** — if someone created a resource outside Terraform that you want to manage:

```bash
terraform import google_compute_instance.app \
  projects/ooh-manager/zones/europe-central2-a/instances/ooh-prod
```

This adds the existing resource to Terraform's state without modifying it.

### The rule

Once you use Terraform, **all changes go through Terraform.** No Console edits. No `gcloud` one-liners that modify resources. If you need to make a quick fix, do it in the `.tf` file and apply. Otherwise drift accumulates and your code becomes a lie.

---

## 10) Pitfalls & Gotchas

**Skipping `terraform plan`** — Always review the plan before `apply`. Terraform will happily delete your production database if you renamed a resource block (it sees "delete old + create new").

**Local state in a team** — Two people running `apply` with local state will corrupt it. Use remote state from day one.

**Hardcoded values** — Use variables for anything that differs between environments. If you hardcode `"ooh-prod"` everywhere, you can't reuse the config for staging.

**Missing `deletion_protection`** — One `terraform destroy` or a resource rename away from losing your database. Always set `deletion_protection = true` on databases and other stateful resources.

**Not reading destroy plans carefully** — Terraform shows `Plan: 0 to add, 0 to change, 1 to destroy.` If that "1 to destroy" is your database, you need to notice. Rename refactors are the most common cause — Terraform sees a new name as "delete old, create new."

**Running `terraform destroy` on production** — Add safeguards. The `environment: production` gate in GitHub Actions helps. Some teams also use Sentinel or OPA policies to block destructive operations.

**Unpinned provider versions** — Without `version = "~> 6.0"`, Terraform downloads the latest provider on `init`. A major version bump can break your config. Always pin.

**Secrets in state** — Terraform state contains resource attributes in plaintext, including passwords. Encrypt your state bucket and restrict access.

---

## 11) Practice Tasks

1. **Install and verify.** Install Terraform (or OpenTofu). Run `terraform version`. Create a new directory, write a `main.tf` with just the Google provider block, and run `terraform init`. Observe what gets downloaded.

2. **Create and destroy a bucket.** Write a config that creates a single GCS bucket with a unique name. Run `plan`, review the output, run `apply`, verify the bucket exists in the Console, then run `destroy` and verify it's gone.

3. **Extract a module.** Take your bucket config and turn it into a module under `modules/storage/`. Call it twice from your root config with different bucket names and storage classes. Apply and verify both buckets exist.

4. **Set up remote state.** Create a GCS bucket for state storage (manually with `gsutil`). Add a `backend "gcs"` block to your config. Run `terraform init` and accept the migration from local to remote state. Verify the state file exists in the bucket.

5. **Handle a secret.** Add a `db_password` variable with `sensitive = true`. Pass it via `TF_VAR_db_password` environment variable. Run `terraform plan` and confirm the value is redacted in the output.

6. **CI/CD plan.** Write a GitHub Actions workflow that runs `terraform init` and `terraform plan` on pull requests that touch your `infra/` directory. You don't need to set up real GCP credentials — focus on the workflow structure.

---

**Previous:** [17-cloud-gcp.md](./17-cloud-gcp.md) - Cloud & GCP Fundamentals
**Next:** [19-exercises.md](./19-exercises.md) - Production Exercises
