# GCP KMS Example with ConfigService

Demonstrates `nestjs-cipher` with **GCP Cloud KMS** using **NestJS ConfigService** and **Application Default Credentials (ADC)**.

## Prerequisites

- GCP project with KMS infrastructure provisioned via OpenTofu
- ADC configured:
  ```bash
  gcloud auth application-default login
  ```
  Or set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json`

## 1. Provision Infrastructure

Use OpenTofu to create the key ring and tenant keys:

```bash
cd ../../infra/tofu/gcp
export TF_VAR_project_id=my-project-123
tofu init && tofu apply -var-file=dev.tfvars
```

Retrieve environment variables from OpenTofu output:

```bash
tofu output app_env_vars
# Output:
# GCP_KMS_PROJECT_ID = "my-project-123"
# GCP_KMS_KEY_RING = "nestjs-cipher-dev"
# GCP_KMS_LOCATION = "global"
```

## 2. Configure Environment

Create `.env.gcp` from the template:

```bash
cp .env.gcp.example .env.gcp
```

Update with values from OpenTofu output:

```bash
export GCP_KMS_PROJECT_ID=my-project-123
export GCP_KMS_KEY_RING=nestjs-cipher-dev
export GCP_KMS_LOCATION=global
```

## 3. Run Example

```bash
source .env.gcp
pnpm build
pnpm example:gcp
```

## How It Works

1. **ConfigService** loads all environment variables via `.env.gcp`
2. **CipherModule.forRootAsync()** validates config at startup
3. **GcpKmsService** encrypts/decrypts using tenant-specific keys
4. All credentials managed via ADC — no secrets in code

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GCP_KMS_PROJECT_ID` | ✅ | GCP project ID |
| `GCP_KMS_KEY_RING` | ✅ | KMS key ring name (from OpenTofu) |
| `GCP_KMS_LOCATION` | ✅ | KMS location (`global` or region like `us-central1`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional | Path to service account JSON key |

**Note:** If `GOOGLE_APPLICATION_CREDENTIALS` is not set, ADC will use the default credentials from `gcloud auth application-default login`.
