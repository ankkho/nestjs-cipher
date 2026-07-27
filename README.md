# nestjs-cipher

![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue) ![NestJS](https://img.shields.io/badge/NestJS-11-red) ![Node.js](https://img.shields.io/badge/Node.js-22+-green) ![pnpm](https://img.shields.io/badge/pnpm-11.0+-F69D3D) ![License](https://img.shields.io/badge/License-MIT-yellow)

> Production-grade NestJS encryption module. Protect sensitive data (emails, PII, tokens) with **AES-256-GCM** + **Google Cloud KMS**. Local mode for development.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Multi-Tenant](#multi-tenant)
- [Infrastructure (OpenTofu)](#infrastructure-opentofu)
- [Architecture](#architecture)
- [Observability](#observability)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Quick Start

### 1. Install

```bash
pnpm add @ankkho/nestjs-cipher
```

**Requirements:** Node.js ≥ 22, NestJS ≥ 10, pnpm ≥ 11

### 2. Register the Module

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CipherModule, Providers } from '@ankkho/nestjs-cipher';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CipherModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        provider: Providers.GCP_KMS,
        gcp: {
          projectId: config.getOrThrow('GCP_PROJECT_ID'),
          keyRing: config.getOrThrow('GCP_KMS_KEY_RING'),
          location: config.getOrThrow('GCP_KMS_LOCATION'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### 3. Encrypt and Decrypt

```typescript
import { CipherService } from '@ankkho/nestjs-cipher';

@Injectable()
export class UserService {
  constructor(private cipher: CipherService) {}

  async createUser(email: string, tenantId: string) {
    const encrypted = await this.cipher.encrypt(email, { tenantId });
    await db.users.create({ email_encrypted: encrypted });
  }

  async getUser(userId: string, tenantId: string) {
    const stored = await db.users.findOne(userId);
    const email = await this.cipher.decrypt(stored.email_encrypted, {
      tenantId,
    });
    return { ...stored, email };
  }
}
```

New tenant keys are created automatically on first encrypt — no manual provisioning needed.

### Local Development

```typescript
CipherModule.forRoot({ provider: Providers.LOCAL })
```

In-memory keys. Not for production.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT_ID` | Yes | GCP project ID |
| `GCP_KMS_KEY_RING` | Yes | KMS key ring name |
| `GCP_KMS_LOCATION` | Yes | Key ring location (e.g., `us-central1`, `global`) |

### Credentials

Uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials).

```bash
# Service account key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# Or gcloud (development only)
gcloud auth application-default login
```

### IAM Roles

The service account needs two roles:

| Role | Scope | Purpose |
|------|-------|---------|
| `roles/cloudkms.admin` | Project | Create keys for new tenants |
| `roles/cloudkms.cryptoKeyEncrypterDecrypter` | Key Ring | Encrypt and decrypt with all keys |

> **Important:** `roles/cloudkms.cryptoKeyAdmin` is a crypto key-level role and **cannot** be applied to key rings. Use `roles/cloudkms.admin` at the project level instead.

If all keys are pre-provisioned via Tofu or gcloud, only `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key ring is required.

## Multi-Tenant

Each tenant gets an isolated KMS key. Tenant A cannot decrypt Tenant B's data.

### Single-Tenant

Use a consistent `tenantId` across all encrypt/decrypt calls:

```typescript
await this.cipher.encrypt(email, { tenantId: 'default' });
await this.cipher.decrypt(encrypted, { tenantId: 'default' });
```

### Multi-Tenant (SaaS)

Pass the tenant's ID from your auth context:

```typescript
await this.cipher.encrypt(email, { tenantId: tenant.id });
await this.cipher.decrypt(encrypted, { tenantId: tenant.id });
```

Keys are created automatically on first encrypt.

### User-Level Isolation

For per-user key isolation (e.g., end-to-end encryption):

```typescript
await this.cipher.encrypt(message, { userId: user.id });
```

## Infrastructure (OpenTofu)

The library includes a ready-to-use Tofu module for provisioning KMS keys. Copy the files into your existing infrastructure.

### Files to Copy

| File | Purpose |
|------|---------|
| [`infra/tofu/gcp/kms.tf`](./infra/tofu/gcp/kms.tf) | Key ring, crypto keys, IAM bindings |
| [`infra/tofu/gcp/outputs.tf`](./infra/tofu/gcp/outputs.tf) | Outputs (key ring ID, app env vars) |

### Prerequisites

Your Tofu root module must define:

```hcl
variable "project_id" { type = string }
variable "environment" { type = string }
variable "location" { type = string }
```

### Setup

**1. Copy the files:**

```bash
cp infra/tofu/gcp/kms.tf infra/tofu/gcp/outputs.tf your-tofu-module/
```

**2. Run:**

```bash
tofu init
tofu plan
tofu apply
```

### Configuration

All variables have defaults. Override in your `.tfvars` as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `tenant_names` | `["default"]` | Tenant IDs to pre-provision |
| `kms_service_account_emails` | `[]` | Service account emails for IAM |
| `kms_key_rotation_period` | `"7776000s"` | Rotation period (90 days) |
| `kms_protection_level` | `"SOFTWARE"` | `SOFTWARE` or `HSM` |

**Single-tenant (no config needed):**

```bash
tofu apply  # Uses tenant-default key
```

**Multi-tenant (pre-provision known tenants):**

```hcl
# your.tfvars
tenant_names = ["org-acme", "org-globex", "org-initech"]
```

**SaaS (runtime key creation):**

```hcl
# your.tfvars
kms_service_account_emails = ["cipher@my-project.iam.gserviceaccount.com"]
```

This grants the two IAM roles needed for the library to create keys at runtime.

### What Gets Created

| Resource | Purpose |
|----------|---------|
| `google_kms_key_ring.pii` | Key ring container |
| `google_kms_crypto_key.tenant` | One key per tenant |
| `google_project_iam_member.kms_admin` | Project-level IAM for key creation |
| `google_kms_key_ring_iam_member.encrypter_decrypter` | Key ring IAM for encrypt/decrypt |

### Outputs

```bash
tofu output key_ring_name    # Key ring name (for GCP_KMS_KEY_RING)
tofu output crypto_key_ids   # Map of tenant → key ID
tofu output app_env_vars     # Ready-to-use env vars
```

Full documentation: [`infra/tofu/gcp/README.md`](./infra/tofu/gcp/README.md)

## Architecture

### Envelope Encryption

```
plaintext ──► AES-256-GCM (local) ──► ciphertext
                 │
                 ├──► random 32-byte DEK (data encryption key)
                 │         │
                 │         ▼
                 │    KMS encrypt (wrap DEK) ──► wrapped DEK
                 │
                 ▼
           { v, ciphertext, wrappedDek, iv, tag }
```

1. Generate a random 32-byte DEK
2. Encrypt plaintext locally with AES-256-GCM
3. Wrap the DEK with KMS (one API call)
4. Zero the DEK from memory
5. Return the encrypted payload

**Why envelope encryption?** Local AES-256-GCM is fast (~1ms). KMS wrapping adds security without encrypting every field through the network. The DEK is never persisted.

### Encrypted Payload

```json
{
  "v": 1,
  "ciphertext": "...",
  "wrappedDek": "...",
  "iv": "...",
  "tag": "..."
}
```

- **At least one** of `tenantId` or `userId` is required
- Use the **same context** for encrypt and decrypt
- **Store the full payload** — all fields are needed for decryption

### Key Auto-Creation

Keys are created automatically on first encrypt with:

- Purpose: `ENCRYPT_DECRYPT`
- Algorithm: `GOOGLE_SYMMETRIC_ENCRYPTION`
- Protection: `SOFTWARE`
- Rotation: 90 days

Existing keys are reused on subsequent calls.

## Observability

OpenTelemetry spans are created automatically:

| Span | Attributes |
|------|------------|
| `nestjs-cipher.encrypt` | `cipher.provider`, `cipher.context.type`, `cipher.payload.version` |
| `nestjs-cipher.decrypt` | `cipher.provider`, `cipher.context.type`, `cipher.payload.version` |

Setup is automatic if OTel SDK is configured in your NestJS app.

## Security

### Best Practices

1. Store credentials in a secure vault (GCP Secret Manager, HashiCorp Vault). Never commit keys.
2. Use least-privilege IAM: `roles/cloudkms.admin` at project level for creation, `roles/cloudkms.cryptoKeyEncrypterDecrypter` on key ring for operations.
3. Enable automatic key rotation (90 days, configured by default).
4. Monitor Cloud Audit Logs for unauthorized KMS access.

### Data Isolation

- Each tenant/user gets a distinct KMS key
- DEKs are generated per-operation and zeroed from memory after use
- Unwrapped DEKs are cached for 5 minutes then discarded
- The library never persists plaintext keys

### Key Lifecycle

| Stage | What Happens |
|-------|-------------|
| First encrypt for new tenant | KMS key created automatically |
| Subsequent encrypts | Existing key reused |
| Key rotation (90d) | New key version created, old versions remain for decryption |
| Tenant deleted | KMS key soft-deleted (30-day recovery window) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module fails at startup` | Verify ADC credentials are set and valid |
| `Decryption fails` | Ensure same `tenantId`/`userId` used for encrypt and decrypt |
| `PERMISSION_DENIED on key creation` | Grant `roles/cloudkms.admin` at project level |
| `PERMISSION_DENIED on encrypt` | Grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key ring |
| `GOOGLE_APPLICATION_CREDENTIALS not set` | Set the env var or run `gcloud auth application-default login` |

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build library
pnpm test             # Run tests
pnpm lint:fix         # Lint and format
npx tsc --noEmit      # Type check
```

### Running Examples

```bash
# Local mode
pnpm build:example && pnpm example

# GCP KMS
cd example/tofu-gcp && source .env.gcp && pnpm build && pnpm example:gcp
```

## License

MIT
