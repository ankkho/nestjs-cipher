# nestjs-cipher

![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue) ![NestJS](https://img.shields.io/badge/NestJS-11-red) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![pnpm](https://img.shields.io/badge/pnpm-10.32+-F69D3D) ![License](https://img.shields.io/badge/License-MIT-yellow)

> Production-grade NestJS encryption module. Encrypt sensitive data (emails, PII, tokens) with **AES-256-GCM** + **Google Cloud KMS** (AWS/Azure coming soon). Local mode for development.

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
- [Infrastructure (OpenTofu)](#infrastructure-opentofu)
- [Development](#development)
- [Resources](#resources)

## Features

- **Envelope Encryption:** AES-256-GCM local encryption with optional KMS key wrapping
- **Zero-Trust DEK:** Data Encryption Keys zeroed from memory after each operation
- **DEK Caching:** Unwrapped DEKs cached in-memory (5 min TTL) to skip KMS on repeated reads
- **Multi-Tenant:** Automatic tenant/user-level key isolation
- **Fast:** ~10-20ms per operation (90% local, minimal KMS calls)
- **Observable:** Pino logging + OpenTelemetry instrumentation
- **Production-Ready:** Full TypeScript, CI/CD validated

## Providers

`nestjs-cipher` supports multiple KMS providers. Choose based on your deployment environment:

| Provider | Use Case | Setup | Key Rotation | Compliance |
| --- | --- | --- | --- | --- |
| **LOCAL** | Development & testing | None | Manual | None |
| **GCP_KMS** | Production (recommended) | Medium | Auto (90d) | SOC 2, ISO 27001, PCI-DSS |

**LOCAL** — In-memory keys; no persistence. Dev and CI/CD only.

**GCP_KMS** — Enterprise-grade key management with audit logging, auto-rotation, and multi-region support. Note: GCP Cloud KMS is a paid service.

**Coming Soon:** AWS KMS, Azure Key Vault

## Installation

```bash
pnpm install @ankkho/nestjs-cipher
```

**Requirements:**
- Node.js 20.0.0 LTS or higher
- pnpm 10.32.0+

## Quick Start

### ⭐ ConfigService (Recommended)

All environment variables via **NestJS ConfigService**:

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
          projectId: config.getOrThrow('GCP_KMS_PROJECT_ID'),
          keyRing: config.getOrThrow('GCP_KMS_KEY_RING'),
          location: config.getOrThrow('GCP_KMS_LOCATION'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

**Environment:** `.env`
```bash
GCP_KMS_PROJECT_ID=my-project
GCP_KMS_LOCATION=us-central1
GCP_KMS_KEY_RING=pii-ring
```

### LocalProvider (Development Only)

```typescript
import { CipherModule, Providers } from '@ankkho/nestjs-cipher';

@Module({
  imports: [CipherModule.forRoot({ provider: Providers.LOCAL })],
})
export class AppModule {}
```

**⚠️ In-memory keys only.** Not for production.

### Use Service

```typescript
import { CipherService } from '@ankkho/nestjs-cipher';

@Injectable()
export class UserService {
  constructor(private cipher: CipherService) {}

  async createUser(email: string, tenantId: string) {
    const encrypted = await this.cipher.encrypt(email, { tenantId });
    await db.users.create({ email_encrypted: encrypted });
  }

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

### GCP KMS

**Credentials:** Uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials).

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# OR
gcloud auth application-default login
```

**Permissions:** Service account requires `roles/cloudkms.cryptographer`.

### Local (Development)

No setup required. Keys stored in-memory only.

## How It Works

```
1. Generate random 32-byte DEK
2. Encrypt plaintext locally (AES-256-GCM)
3. Wrap DEK with KMS
4. Zero DEK from memory
5. Return: { v, ciphertext, wrappedDek, iv, tag }
```

**Requirements:**
- At least one of `tenantId` or `userId` required
- Same context for encrypt & decrypt
- `wrappedDek` safe to store (encrypted by KMS)
- DEK never persisted; zeroed after each operation

**Payload:**
```json
{
  "v": 1,
  "ciphertext": "...",
  "wrappedDek": "...",
  "iv": "...",
  "tag": "..."
}
```

**Versioning:** Use `v` field for algorithm migrations. Decrypt old `v:1` → re-encrypt to `v:2` during background jobs.

## Multi-Tenant Architecture

Each tenant gets a distinct KMS key:

```
tenantId: 'org-100' → .../cryptoKeys/tenant-org-100
userId: 'usr-42'    → .../cryptoKeys/user-usr-42
```

**Result:** Tenant A cannot decrypt Tenant B's data.

**Envelope Encryption Benefits:**
- Generate random DEK per operation
- Encrypt data locally (AES-256-GCM)
- Wrap DEK once with KMS
- Single KMS call per operation → cost-effective at scale

## Observability

OpenTelemetry spans: `nestjs-cipher.encrypt`, `nestjs-cipher.decrypt`

**Attributes:**
- `cipher.provider` — KMS provider (e.g., `GCP_KMS`)
- `cipher.context.type` — `tenant` or `user`
- `cipher.payload.version` — Payload version

**Setup:** Automatic if OTel SDK is configured.

## Security Best Practices

1. ✅ Store credentials in secure vault; never commit keys
2. ✅ Grant service account least privilege (`roles/cloudkms.cryptographer` only)
3. ✅ Enable automatic key rotation (90 days recommended)
4. ✅ Monitor Cloud Audit Logs for unauthorized access
5. ✅ Use TLS for all communication

## Testing with Example

### LocalProvider (Development)

```bash
pnpm build:example && pnpm example
```

### GCP KMS with OpenTofu (Production)

Full setup with infrastructure provisioning:

```bash
cd example/tofu-gcp && source .env.gcp && pnpm build && pnpm example:gcp
```

See [example/tofu-gcp/README.md](./example/tofu-gcp/README.md) for details.

## Troubleshooting

| Issue | Solution |
| --- | --- |
| Module fails at startup | Check credentials are set and have correct KMS permissions |
| Decryption fails | Verify same `tenantId`/`userId` context used for encrypt & decrypt |
| High latency | Check network connectivity to KMS provider; DEK caching is built-in (5 min TTL) |
| Credential validation errors | Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set or `gcloud auth application-default login` run |

## Production Deployment

- Use `Providers.GCP_KMS` (not Local)
- Store credentials in secure vault (GCP Secret Manager, Vault, etc.)
- Grant service account `roles/cloudkms.cryptographer` only
- Enable Cloud Audit Logs for monitoring
- Set up alerts for KMS API errors and quota
- Create keys in multiple regions for failover
- Rotate credentials immediately if compromised

## Infrastructure (OpenTofu)

> Environments: `dev`, `test`, `stage`, `prod`.

GCP KMS infrastructure is provisioned with [OpenTofu](https://opentofu.org/).

Provider: [`GCP KMS`](./infra/tofu/gcp/README.md).

## Development

### Requirements
- Node.js 20.0.0 LTS or higher
- pnpm 10.32.0+

### Commands

```bash
# Install dependencies
pnpm install

# Build library
pnpm build

# Build example
pnpm build:example

# Run example (compiled code)
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

- [Contributing](./CONTRIBUTING.md) — Contribution guidelines
- [Release Process](./RELEASE_README.md) — Automated release workflow
- [Security Policy](./.github/SECURITY.md) — Security & reporting
- [Example](./example) — Working sample
- [Infrastructure (OpenTofu)](./infra/tofu/gcp/README.md) — GCP KMS setup

## License

MIT

