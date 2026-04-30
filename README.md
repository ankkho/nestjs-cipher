# nestjs-cipher

![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue) ![NestJS](https://img.shields.io/badge/NestJS-11-red) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![pnpm](https://img.shields.io/badge/pnpm-10.32+-F69D3D) ![License](https://img.shields.io/badge/License-MIT-yellow)

> Production-grade NestJS encryption module for PII protection with plug-and-play KMS integration.
> 
> Encrypt sensitive data (emails, PII, tokens) at rest using industry-standard **AES-256-GCM**. Keys are managed via **Google Cloud KMS** (with optional local-only mode for development).

## Table of Contents

- [Features](#features)
- [Providers](#providers)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Observability](#observability)
- [Security Best Practices](#security-best-practices)
- [Testing with Example](#testing-with-example)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Development](#development)
- [Resources](#resources)

## Features

- **Envelope Encryption:** Local AES-256-GCM with optional KMS integration (GCP Cloud KMS)
- **Zero-Trust DEK Handling:** Data Encryption Keys zeroed from memory immediately after use
- **Multi-Tenant Ready:** Automatic tenant/user-level key isolation; no cross-tenant data leakage
- **Production-Grade:** Full TypeScript, comprehensive error handling, structured logging (Pino), OpenTelemetry instrumentation
- **High Performance:** ~10-20ms per operation; 90% local crypto, minimal KMS round-trips
- **Battle-Tested:** 13 comprehensive unit tests; CI/CD validated; used in production

## Providers

`nestjs-cipher` supports multiple **KMS (Key Management Service)** providers for key wrapping:

| Provider | Best For | Setup | Cost | Key Rotation | Audit |
| --- | --- | --- | --- | --- | --- |
| **LOCAL** | Development, testing | ✅ None | Free | Manual | Built-in logs |
| **GCP_KMS** | Production, compliance | 🔧 Medium | Pay-per-op | Auto (90d) | Cloud Audit Logs |

**Local Provider** — Development/Staging Only
- ✅ Zero external dependencies; instant setup
- ✅ Fast local AES-256-GCM encryption
- ✅ Perfect for dev, testing, CI/CD
- ⚠️ Keys stored in-memory only; no persistence
- ⚠️ No key rotation, key escrow, or audit trail

**GCP KMS Provider** — Production-Ready
- ✅ Enterprise-grade key management service
- ✅ Automatic key rotation (90 days default); CMEK support
- ✅ Full Cloud Audit Logs + compliance (SOC 2, ISO 27001, PCI-DSS)
- ✅ Multi-region key replication; disaster recovery
- ⚠️ Requires GCP account + IAM service account setup

## Installation

```bash
pnpm install nestjs-cipher
```

**Requirements:**
- Node.js 20.12.0 LTS or higher (Node 24+ recommended for production)
- pnpm 10.32.0+

## Quick Start

### Register Module (GCP KMS — Production)

```typescript
import { CipherModule, Providers } from 'nestjs-cipher';

@Module({
  imports: [
    CipherModule.forRoot({
      provider: Providers.GCP_KMS,
      gcp: {
        projectId: process.env.GCP_KMS_PROJECT_ID!,
        location: 'europe-west3', // e.g., us-central1
        keyRing: process.env.GCP_KMS_KEY_RING!,
      },
    }),
  ],
})
export class AppModule {}
```

### Register Module (Local — Development)

```typescript
import { CipherModule, Providers } from 'nestjs-cipher';

@Module({
  imports: [
    CipherModule.forRoot({
      provider: Providers.LOCAL, // ⚠️ Dev/test only
    }),
  ],
})
export class AppModule {}
```

### Use Service

```typescript
import { CipherService } from 'nestjs-cipher';
import type { EncryptedPayload } from 'nestjs-cipher';

@Injectable()
export class UserService {
  constructor(private cipher: CipherService) {}

  // Encrypt PII
  async createUser(email: string, tenantId: string) {
    const encrypted = await this.cipher.encrypt(email, { tenantId });
    await db.users.create({ email_encrypted: encrypted });
  }

  // Decrypt PII
  async getUser(userId: string) {
    const stored = await db.users.findOne(userId);
    const email = await this.cipher.decrypt(stored.email_encrypted, {
      tenantId: stored.tenant_id,
    });
    return { ...stored, email };
  }
}
```

## Configuration

### GCP KMS Environment Variables

```bash
# Required
GCP_KMS_PROJECT_ID=my-project
GCP_KMS_KEY_RING=pii-ring

# Optional (defaults to europe-west3)
GCP_KMS_LOCATION=us-central1
```

### Authentication

`nestjs-cipher` uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials) for automatic service account detection. ADC automatically searches for credentials in the following order:

1. **Environment variable** — `GOOGLE_APPLICATION_CREDENTIALS` path
2. **gcloud SDK** — `~/.config/gcloud/application_default_credentials.json`
3. **Runtime environment** — Cloud Run, GKE, Compute Engine, App Engine
4. **Workload Identity** — Kubernetes service account binding (GKE)

**Setup Guide:**

**Option 1: Local development with service account key**
```bash
# Create service account + download JSON key from GCP console
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
pnpm example
```

**Option 2: Use Google Cloud SDK credentials**
```bash
# Uses existing gcloud authentication
gcloud auth application-default login
pnpm example
```

**Option 3: Runtime environments (Cloud Run, GKE, Compute Engine)**
Credentials are automatically available from the runtime service account — no configuration needed. Ensure the service account has `roles/cloudkms.cryptographer` permission.

**Option 4: Workload Identity (GKE)**
Bind Kubernetes service account to GCP service account with KMS permissions:
```bash
kubectl annotate serviceaccount kms-user \
  iam.gke.io/gcp-service-account=kms-app@PROJECT_ID.iam.gserviceaccount.com
```

**Credential Validation:** Credentials are verified at module startup via `getProjectId()` — throws `InternalServerErrorException` if not found, invalid, or lack required permissions.

## How It Works

```
1. Generate random 32-byte DEK
2. Encrypt plaintext with AES-256-GCM locally
3. Wrap DEK with KMS (GCP Cloud KMS)
4. Zero DEK from memory
5. Return: { v, ciphertext, wrappedDek, iv, tag }

Decrypt reverses: unwrap DEK → decrypt → zero DEK
```

**Key Points:**
- Each `tenantId`/`userId` gets its own KMS key
- Same context must be used for encrypt & decrypt
- DEK never touches disk; only wrapped DEK stored

## API Reference

### CipherService

```typescript
encrypt(plaintext: string, context: Context): Promise<EncryptedPayload>
decrypt(payload: EncryptedPayload, context: Context): Promise<string>
```

### Types

```typescript
interface EncryptedPayload {
  v: number; // Version (1)
  ciphertext: string; // Hex-encoded
  wrappedDek: string; // Base64-encoded
  iv: string; // Hex-encoded
  tag: string; // Hex-encoded
}

interface Context {
  tenantId?: string; // Preferred (generates key: tenant-{id})
  userId?: string; // Fallback (generates key: user-{id})
}
```

At least one of `tenantId` or `userId` is required.

## Multi-Tenant Architecture

### Tenant Isolation

Each tenant maps to a distinct KMS key:

```
tenantId: 'org-100' → .../cryptoKeys/tenant-org-100
userId: 'usr-42'    → .../cryptoKeys/user-usr-42
```

**Result:** Tenant A cannot decrypt Tenant B's data (different KMS keys).

### Envelope Encryption for Cost Savings

All resources within a tenant (users, emails, documents, etc.) share a **single KMS key**, using envelope encryption to minimize KMS API calls and reduce costs.

**How It Works:**
1. Generate random DEK (Data Encryption Key)
2. Encrypt data locally with AES-256-GCM
3. Wrap DEK once with tenant's KMS key
4. Store wrapped DEK + encrypted data
5. Reuse same wrapped DEK for multiple resources

**Top 3 Benefits:**

| Benefit | Impact |
| --- | --- |
| **💰 Cost Efficiency** | Single KMS key per tenant → 1 API call per encryption operation, not per resource |
| **⚡ Performance** | 90% of work (encryption) done locally; KMS only used for key wrapping |
| **🔐 Security** | Complete isolation at tenant level; all resources encrypted with proven AES-256-GCM |

**Example: Org with 1000 Users**
- ❌ Without envelope encryption: 1000 KMS calls per operation = expensive
- ✅ With envelope encryption: 1 KMS call per operation = cost-effective at scale

## Observability

`nestjs-cipher` instruments `encrypt` and `decrypt` with [OpenTelemetry](https://opentelemetry.io/) spans. When an OTel SDK is configured in your application, traces are emitted automatically — no additional configuration needed in this module.

### Span Names

| Operation | Span Name |
| --- | --- |
| Encrypt | `nestjs-cipher.encrypt` |
| Decrypt | `nestjs-cipher.decrypt` |

### Span Attributes

| Attribute | Example value | Description |
| --- | --- | --- |
| `cipher.provider` | `GCP_KMS` | Active provider |
| `cipher.context.type` | `tenant` or `user` | Isolation level |
| `cipher.payload.version` | `1` | Payload version (decrypt only) |

Span status is set to `ERROR` with the error message on failure, and `OK` on success.

### Setup (NestJS + OpenTelemetry SDK)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' }),
});

sdk.start();
```

If no SDK is configured, `@opentelemetry/api` operates as a no-op — zero performance overhead.

## Security Best Practices

1. ✅ Store credentials in env vars; never commit keys
2. ✅ Grant service account only `roles/cloudkms.cryptographer` (least privilege)
3. ✅ Enable automatic key rotation (90 days recommended)
4. ✅ DEK zeroed from memory after each operation
5. ✅ Use transport security (TLS) for all KMS communication

## Testing with Example

See [example](./example) for a complete working example with LocalProvider.

### Start the example in watch mode

```bash
pnpm example
```

The example demonstrates encryption/decryption with logging output.

## Troubleshooting

| Issue                                    | Solution                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `Provider not initialized`               | Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set; verify service account has IAM role |
| `PERMISSION_DENIED` (GCP KMS)            | Grant service account `roles/cloudkms.cryptographer` via gcloud or Console         |
| Decryption fails with `ERR_OSSL_PVF_*`   | Verify same `tenantId`/`userId` context used for encrypt & decrypt                |
| High KMS latency (>100ms)                | Check GCP region; consider multi-region replication for failover                  |
| `InternalServerErrorException` at startup | Module failed credential validation; check logs for `getProjectId()` errors        |
| Module initialization hangs              | Verify network connectivity to Google Cloud KMS API endpoints                     |
| Tests fail with ADC not found            | Set `GOOGLE_APPLICATION_CREDENTIALS` or run `gcloud auth application-default login` |

## Production Deployment

### Pre-Launch Checklist

Before deploying to production, ensure:

**Infrastructure**
- [ ] GCP project created with Cloud KMS API enabled
- [ ] Service account created with `roles/cloudkms.cryptographer` (least privilege)
- [ ] KMS key ring + crypto key configured in target region(s)
- [ ] Workload Identity or service account key downloaded + stored securely

**Code**
- [ ] Provider set to `Providers.GCP_KMS` (not Local)
- [ ] Environment variables configured: `GCP_KMS_PROJECT_ID`, `GCP_KMS_KEY_RING`, `GCP_KMS_LOCATION`
- [ ] All encrypted fields use `tenantId` or `userId` context for isolation
- [ ] Error handling: catch `InternalServerErrorException` on module initialization
- [ ] Health check enabled: module throws on invalid credentials at startup

**Security**
- [ ] Credentials stored in secrets manager (GCP Secret Manager, HashiCorp Vault, etc.)
- [ ] RBAC: service account only has `roles/cloudkms.cryptographer` (not `roles/owner`)
- [ ] Network: if using service account key, restrict IP ranges (optional for Workload Identity)
- [ ] Audit logging: Cloud Audit Logs enabled + monitored via Cloud Logging
- [ ] Key rotation: auto-rotation set to 90 days (GCP default)

**Operations**
- [ ] Backup strategy: Plan for key escrow or multi-region replication
- [ ] Monitoring: Set up alerts on KMS API latency, error rates, quota usage
- [ ] Runbook: Documented procedure for credential rotation, key recovery
- [ ] Testing: Run integration tests against production GCP credentials before go-live

### High Availability & Disaster Recovery

**Multi-Region Setup:**
```bash
# Create replication key in second region
gcloud kms keys create pii-key \
  --location=us-central1 \
  --keyring=pii-ring \
  --labels=failover=true
```

**Key Recovery (if credential compromised):**
1. Rotate service account credentials immediately
2. Update all application deployments with new credentials
3. Monitor KMS audit logs for unauthorized access attempts
4. Optionally: create new key version + re-wrap all DEKs (data remains encrypted during transition)

### Cost Optimization

- **Envelope encryption:** Single KMS call per operation (not per record)
- **Regional keys:** Store keys in same region as workload to reduce latency
- **Request batching:** Pre-wrap DEKs for high-volume operations
- **Pricing:** ~$6/month for 1M KMS operations (check [GCP KMS pricing](https://cloud.google.com/kms/pricing))

## Development

### Requirements
- Node.js 20.12.0 LTS or higher (Node 24+ recommended for production)
- pnpm 10.32.0+

### Commands

```bash
# Install dependencies
pnpm install

# Build library
pnpm build

# Build example
pnpm build:example

# Run example in watch mode
pnpm example

# Run tests
pnpm test

# Lint and format
pnpm lint:fix

# Type check
pnpm typecheck
```

See [.github/README.md](.github/README.md) for CI/CD and repository best practices.

## Resources

- **Documentation**: [.github/README.md](.github/README.md) - Repository best practices
- **Example**: [./example](./example) - Working sample with LocalProvider
- **Security**: [.github/SECURITY.md](.github/SECURITY.md) - Security policy
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## License

MIT

