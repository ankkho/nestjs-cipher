# nestjs-cipher

![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue) ![NestJS](https://img.shields.io/badge/NestJS-11-red) ![Node.js](https://img.shields.io/badge/Node.js-22+-green) ![pnpm](https://img.shields.io/badge/pnpm-11.0+-F69D3D) ![License](https://img.shields.io/badge/License-MIT-yellow)

> Production-grade NestJS encryption module. Protect sensitive data (emails, PII, tokens) with **AES-256-GCM** + **Google Cloud KMS**. Local mode for development.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Multi-Tenant](#multi-tenant)
- [Infrastructure](#infrastructure-opentofu)
- [Observability](#observability)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Resources](#resources)

## Quick Start

### 1. Install

```bash
pnpm install @ankkho/nestjs-cipher
```

**Requirements:** Node.js ≥ 22, pnpm ≥ 11

### 2. Configure

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

```bash
# .env
GCP_PROJECT_ID=my-project
GCP_KMS_LOCATION=us-central1
GCP_KMS_KEY_RING=pii-ring
```

### 3. Use

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

That's it. New tenant keys are created automatically on first encrypt — no manual provisioning needed.

### Local Development

```typescript
import { CipherModule, Providers } from '@ankkho/nestjs-cipher';

@Module({
  imports: [CipherModule.forRoot({ provider: Providers.LOCAL })],
})
export class AppModule {}
```

In-memory keys only. Not for production.

## Configuration

### GCP KMS

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT_ID` | Yes | GCP project ID |
| `GCP_KMS_KEY_RING` | Yes | KMS key ring name |
| `GCP_KMS_LOCATION` | Yes | Key ring location (`us-central1`, `global`, etc.) |

**Credentials:** Uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials).

```bash
# Option 1: Service account key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option 2: gcloud (development only)
gcloud auth application-default login
```

**IAM:** The service account needs two roles for the library to create keys automatically:

| Role | Scope | Grants |
|------|-------|--------|
| `roles/cloudkms.admin` | Project | `cloudkms.cryptoKeys.create` — create keys for new tenants |
| `roles/cloudkms.cryptoKeyEncrypterDecrypter` | Key Ring | `useToEncrypt` / `useToDecrypt` — encrypt/decrypt with all keys |

> **Note:** `roles/cloudkms.cryptoKeyAdmin` is a crypto key-level role and **cannot** be applied to key rings. Use `roles/cloudkms.admin` at the project level instead.

If you pre-provision all keys via Tofu/gcloud and don't need auto-creation, only `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key ring is required.

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

**Why envelope encryption?** Local AES-256-GCM is fast (~1ms). KMS wrapping adds security without encrypting every field through the network. The DEK is never persisted — it's generated, used, and zeroed each operation.

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

| Field | Purpose |
|-------|---------|
| `v` | Payload version (for future algorithm migrations) |
| `ciphertext` | AES-256-GCM encrypted data |
| `wrappedDek` | DEK encrypted by KMS (safe to store) |
| `iv` | Initialization vector |
| `tag` | GCM authentication tag |

**Requirements:**
- At least one of `tenantId` or `userId` is required
- Use the same context for encrypt and decrypt
- Store the full payload — all fields are needed for decryption

### Key Auto-Creation

The library automatically creates KMS keys for new tenants on first encrypt. If `tenant-{tenantId}` doesn't exist, it's created with:

- Purpose: `ENCRYPT_DECRYPT`
- Algorithm: `GOOGLE_SYMMETRIC_ENCRYPTION`
- Protection: `SOFTWARE`
- Rotation: 90 days

Existing keys are reused — no-op on subsequent calls.

## Multi-Tenant

Each tenant gets an isolated KMS key:

```
tenantId: "org-100"  → .../cryptoKeys/tenant-org-100
tenantId: "org-200"  → .../cryptoKeys/tenant-org-200
userId:   "usr-42"   → .../cryptoKeys/user-usr-42
```

Tenant A cannot decrypt Tenant B's data. Key isolation is enforced by KMS.

### Single-Tenant

Use a consistent `tenantId` (e.g., `"default"`) across all encrypt/decrypt calls:

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

Keys are created automatically on first encrypt. No infrastructure changes needed per tenant.

### User-Level Isolation

For per-user key isolation (e.g., end-to-end encryption):

```typescript
await this.cipher.encrypt(message, { userId: user.id });
```

## Infrastructure (OpenTofu)

Pre-provision known tenants with Tofu. Unknown tenants are auto-created at runtime by the library.

### Quick Setup

Copy `kms.tf` into your existing Tofu module. It assumes your module already has `var.project_id`, `var.environment`, and `var.location`.

```hcl
# In your .tfvars
tenant_names = ["org-acme", "org-globex"]  # optional, defaults to ["default"]
```

```bash
tofu plan
tofu apply
```

### SaaS: Runtime Key Creation

For apps where tenants are created at runtime, grant both IAM roles so the library can create keys and encrypt/decrypt:

```hcl
# In your .tfvars
kms_service_account_emails = ["cipher@my-project.iam.gserviceaccount.com"]
```

### IAM Roles

| Role | Scope | When to Use |
|------|-------|-------------|
| `roles/cloudkms.admin` | Project | Library creates keys automatically (SaaS, dynamic tenants) |
| `roles/cloudkms.cryptoKeyEncrypterDecrypter` | Key Ring | Encrypt/decrypt with all keys in the ring (required for all deployments) |

See [`infra/tofu/gcp/README.md`](./infra/tofu/gcp/README.md) for full Tofu documentation.

## Observability

OpenTelemetry spans are created automatically:

| Span | Description |
|------|-------------|
| `nestjs-cipher.encrypt` | Encrypt operation |
| `nestjs-cipher.decrypt` | Decrypt operation |

**Attributes:**
- `cipher.provider` — KMS provider (e.g., `GCP_KMS`)
- `cipher.context.type` — `tenant` or `user`
- `cipher.payload.version` — Payload version

Setup is automatic if OTel SDK is configured in your NestJS app.

## Security

### Best Practices

1. Store credentials in a secure vault (GCP Secret Manager, HashiCorp Vault). Never commit keys.
2. Grant `roles/cloudkms.admin` at the project level (not key ring) for runtime key creation. Grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key ring for encrypt/decrypt.
3. Enable automatic key rotation (90 days recommended, configured by default).
4. Monitor Cloud Audit Logs for unauthorized KMS access.
5. Use TLS for all network communication.

### Data Isolation

- Each tenant/user gets a distinct KMS key
- DEKs are generated per-operation and zeroed from memory after use
- Unwrapped DEKs are cached for 5 minutes (configurable) then discarded
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
| `PERMISSION_DENIED on key creation` | Grant `roles/cloudkms.admin` at project level (not key ring — `cryptoKeyAdmin` is invalid on key rings) |
| `PERMISSION_DENIED on encrypt` | Grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key ring |
| `NOT_FOUND` on encrypt | Key doesn't exist and auto-creation is disabled. Check IAM permissions. |
| High latency | Check network to GCP. DEK caching reduces KMS calls (5 min TTL). |
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

## Resources

- [Contributing](https://github.com/ankkho/nestjs-cipher/blob/main/CONTRIBUTING.md)
- [Release Process](https://github.com/ankkho/nestjs-cipher/blob/main/RELEASE_README.md)
- [Security Policy](https://github.com/ankkho/nestjs-cipher/blob/main/.github/SECURITY.md)
- [Infrastructure (OpenTofu)](https://github.com/ankkho/nestjs-cipher/blob/main/infra/tofu/gcp/README.md)
- [Example](https://github.com/ankkho/nestjs-cipher/tree/main/example)

## License

MIT
