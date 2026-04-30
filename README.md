# nestjs-cipher

![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue) ![NestJS](https://img.shields.io/badge/NestJS-11-red) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![pnpm](https://img.shields.io/badge/pnpm-10.32+-F69D3D) ![License](https://img.shields.io/badge/License-MIT-yellow)

> Production-grade NestJS encryption module for PII protection with multi-cloud KMS integration.
> 
> Encrypt sensitive data (emails, PII, tokens) at rest using industry-standard **AES-256-GCM**. Keys are managed via **Google Cloud KMS** (AWS KMS and Azure Key Vault coming soon), with optional local-only mode for development.

## Table of Contents

- [Features](#features)
- [Providers](#providers)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Observability](#observability)
- [Security Best Practices](#security-best-practices)
- [Testing with Example](#testing-with-example)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Development](#development)
- [Resources](#resources)

## Features

- **Envelope Encryption:** AES-256-GCM local encryption with optional KMS key wrapping
- **Zero-Trust DEK:** Data Encryption Keys zeroed from memory after each operation
- **Multi-Tenant:** Automatic tenant/user-level key isolation
- **Fast:** ~10-20ms per operation (90% local, minimal KMS calls)
- **Observable:** Pino logging + OpenTelemetry instrumentation
- **Production-Ready:** Full TypeScript, 13 unit tests, CI/CD validated

## Providers

`nestjs-cipher` supports multiple KMS providers. Choose based on your deployment environment:

| Provider | Use Case | Setup | Key Rotation | Compliance |
| --- | --- | --- | --- | --- |
| **LOCAL** | Development & testing | None | Manual | None |
| **GCP_KMS** | Production (recommended) | Medium | Auto (90d) | SOC 2, ISO 27001, PCI-DSS |

**LOCAL** — In-memory keys; no persistence. Dev and CI/CD only.

**GCP_KMS** — Enterprise-grade key management with audit logging, auto-rotation, and multi-region support.

**Coming Soon:** AWS KMS, Azure Key Vault

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

### GCP KMS (Example: Production Setup)

**Environment Variables:**
```bash
GCP_KMS_PROJECT_ID=my-project
GCP_KMS_KEY_RING=pii-ring
GCP_KMS_LOCATION=europe-west3  # Optional; defaults to europe-west3
```

**Authentication:**
`nestjs-cipher` uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials). ADC searches for credentials in order:

1. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. `~/.config/gcloud/application_default_credentials.json` (gcloud CLI)
3. Runtime environment (Cloud Run, GKE, Compute Engine, App Engine)
4. Workload Identity binding (GKE)

**Local Development:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
pnpm example
```

**Validation:** Module startup throws `InternalServerErrorException` if credentials are not found or lack `roles/cloudkms.cryptographer` permission.

### Local Setup (Development Only)

**No Configuration Required:**
```typescript
import { CipherModule, Providers } from 'nestjs-cipher';

@Module({
  imports: [
    CipherModule.forRoot({
      provider: Providers.LOCAL,
    }),
  ],
})
export class AppModule {}
```

Local provider stores encryption keys in-memory only. Keys are lost on application restart. **Not suitable for production.**

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
- **⚠️ At least one of `tenantId` or `userId` is required**

## Multi-Tenant Architecture

`nestjs-cipher` uses **envelope encryption** to achieve secure, cost-effective multi-tenant data isolation.

### Tenant Isolation

Each tenant maps to a distinct KMS key:

```
tenantId: 'org-100' → .../cryptoKeys/tenant-org-100
userId: 'usr-42'    → .../cryptoKeys/user-usr-42
```

**Result:** Tenant A cannot decrypt Tenant B's data (different KMS keys).

### Envelope Encryption for Cost Savings

Share a **single KMS key** per tenant; use envelope encryption to minimize KMS API calls.

**How It Works:**
1. Generate random DEK (Data Encryption Key)
2. Encrypt data locally with AES-256-GCM
3. Wrap DEK once with tenant's KMS key
4. Store wrapped DEK + encrypted data

**Benefits:** Single KMS call per operation (not per record) → cost-effective at scale.

## Observability

`nestjs-cipher` instruments encrypt/decrypt with [OpenTelemetry](https://opentelemetry.io/) spans. Traces are emitted automatically if an OTel SDK is configured; no additional setup needed in this module.

**Spans:** `nestjs-cipher.encrypt`, `nestjs-cipher.decrypt`

**Attributes:**
- `cipher.provider` — KMS provider (e.g., `GCP_KMS`)
- `cipher.context.type` — `tenant` or `user`
- `cipher.payload.version` — Payload version

## Security Best Practices

1. ✅ Store credentials in secure vault; never commit keys
2. ✅ Grant service account least privilege (`roles/cloudkms.cryptographer` only)
3. ✅ Enable automatic key rotation (90 days recommended)
4. ✅ Monitor Cloud Audit Logs for unauthorized access
5. ✅ Use TLS for all communication

## Testing with Example

See [example](./example) for a complete working example with LocalProvider.

### Start the example in watch mode

```bash
pnpm example
```

The example demonstrates encryption/decryption with logging output.

## Troubleshooting

| Issue | Solution |
| --- | --- |
| Module fails at startup | Check credentials are set and have correct KMS permissions |
| Decryption fails | Verify same `tenantId`/`userId` context used for encrypt & decrypt |
| High latency | Check network connectivity to KMS provider; consider local caching |
| Credential validation errors | Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set or `gcloud auth application-default login` run |

## Production Deployment

**Essentials:**
- Use `Providers.GCP_KMS` (not Local)
- Store credentials in secure vault (GCP Secret Manager, HashiCorp Vault, etc.)
- Grant service account `roles/cloudkms.cryptographer` only
- Enable Cloud Audit Logs for access monitoring
- Set up alerts for KMS API errors and quota usage

**Fault Tolerance:**
- Create KMS keys in multiple regions for failover
- Rotate credentials immediately if compromised
- Module startup validates credentials and fails fast on invalid configuration

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
- **Example**: [example](./example) - Working sample with LocalProvider
- **Security**: [.github/SECURITY.md](.github/SECURITY.md) - Security policy
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## License

MIT

