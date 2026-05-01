# GCP KMS — OpenTofu

Provisions the Google Cloud KMS infrastructure used by `nestjs-cipher` for PII encryption.

## Structure

```
gcp/
├── main.tf         # Provider + API enablement
├── kms.tf          # Key ring + crypto keys
├── variables.tf    # Input variables
├── outputs.tf      # Outputs (incl. app env vars)
├── dev.tfvars
├── test.tfvars
├── stage.tfvars
└── prod.tfvars
```

## Prerequisites

- **OpenTofu ≥ 1.6** — [install instructions](https://opentofu.org/docs/intro/install/)
  - macOS: `brew install opentofu`
  - Linux: `snap install --classic opentofu` or see [Linux install](https://opentofu.org/docs/intro/install/linux/)
  - Windows: `winget install OpenTofu.OpenTofu` or see [Windows install](https://opentofu.org/docs/intro/install/windows/)
- GCP project with billing enabled
- ADC configured: `gcloud auth application-default login`

## Usage

```bash
cd infra/tofu/gcp

export TF_VAR_project_id=<your-project-id>

tofu init

# Choose your environment
tofu plan  -var-file=dev.tfvars
tofu apply -var-file=dev.tfvars

# Get env vars for nestjs-cipher
tofu output app_env_vars
```

## Multi-Tenant vs Single-Tenant

`nestjs-cipher` supports both modes. The `tenant_names` variable controls how many KMS keys are provisioned — **one key is created per tenant**.

### Multi-tenant

Each tenant gets an isolated key. Encrypting with one tenant's key cannot be decrypted with another's.

```hcl
# dev.tfvars
tenant_names = ["org-acme", "org-globex", "org-initech"]
```

Costs scale linearly: 3 tenants × $0.06/key/month = $0.18/month (SOFTWARE, dev).

### Single-tenant / shared key

Use a single logical name for apps that don't isolate by tenant:

```hcl
# dev.tfvars
tenant_names = ["default"]
```

The application always passes the same `tenantId` (`"default"`) when calling `cipher.encrypt` / `cipher.decrypt`.

## Environment Comparison

| Setting          | dev / test         | stage              | prod                     |
|------------------|--------------------|--------------------|--------------------------|
| Protection level | `SOFTWARE`         | `SOFTWARE`         | `HSM` (FIPS 140-2 L3)   |
| Key rotation     | 1 year             | 90 days            | 90 days                  |
| Location         | `global`           | `global`           | Regional (data residency)|
| Cost / key / mo  | ~$0.06             | ~$0.06             | ~$1.00                   |

## Adding or Removing Tenants

Edit the target `.tfvars` and update `tenant_names`, then apply:

```bash
tofu apply -var-file=prod.tfvars
```

> **Note:** GCP KMS keys are soft-deleted on `destroy` with a 30-day scheduled deletion. They cannot be force-deleted immediately.

## Remote State (recommended for teams)

Uncomment the `backend "gcs"` block in `main.tf` and create a GCS bucket:

```bash
gsutil mb gs://your-tf-state-bucket
```

## Destroy

```bash
# Only works if prevent_destroy = false (never prod)
tofu destroy -var-file=dev.tfvars
```
