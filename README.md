# nestjs-cipher

![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue) ![NestJS](https://img.shields.io/badge/NestJS-11-red) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![pnpm](https://img.shields.io/badge/pnpm-10.32+-F69D3D) ![License](https://img.shields.io/badge/License-MIT-yellow) ![Production](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

Production-grade NestJS encryption module for PII protection using AES-256-GCM locally with optional GCP Cloud KMS key wrapping.

## Table of Contents

- [Features](#features)
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
- [Development](#development)
- [Resources](#resources)

## Features

- **Envelope Encryption:** Local AES-256-GCM with optional GCP KMS integration
- **Secure:** DEK (Data Encryption Key) zeroed from memory after each operation
- **Multi-Tenant:** Automatic tenant/user-level key isolation
- **Typed:** Full TypeScript support with strict types
- **Fast:** ~10-20ms per operation (local crypto + KMS round-trip)
- **Observable:** Structured logging (Pino) + OpenTelemetry traces on encrypt/decrypt + health checks
- **Tested:** 13 comprehensive unit tests, production CI/CD

## Installation

```bash
pnpm install nestjs-cipher
```

**Requirements:**
- Node.js 20 LTS or higher
- pnpm 10.32.0+

## Quick Start

### Register Module

```typescript
import { CipherModule, Providers } from 'nestjs-cipher';

@Module({
  imports: [
    CipherModule.forRoot({
      provider: Providers.GCP_KMS,
      gcp: {
        projectId: process.env.GCP_KMS_PROJECT_ID!,
        location: 'europe-west3',
        keyRing: process.env.GCP_KMS_KEY_RING!,
      },
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

`nestjs-cipher` uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials) for automatic service account detection. Choose **one** of:

**Option 1: Local development with service account key**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
pnpm example
```

**Option 2: Use Google Cloud SDK credentials**
```bash
gcloud auth application-default login
pnpm example
```

**Option 3: Runtime environments (Cloud Run, GKE, Compute Engine)**
Credentials are automatically available from the runtime service account — no configuration needed.

**Validation:** Credentials are verified at module startup — throws `InternalServerErrorException` if not found or invalid.

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

| Issue                           | Solution                                              |
| ------------------------------- | ----------------------------------------------------- |
| `Provider not initialized`      | Check `GCP_KMS_CREDENTIALS_PATH` + service account IAM |
| `PERMISSION_DENIED`             | Add `roles/cloudkms.cryptographer` to service account  |
| Decryption fails                | Verify same context (`tenantId`/`userId`) used        |
| High latency (>50ms)            | Check GCP connectivity; monitor KMS quotas            |
| Node version incompatible       | Upgrade to Node.js 20 LTS or higher                   |
| pnpm install fails              | Ensure pnpm 10.32.0+ is installed                     |

## Development

### Requirements
- Node.js 20 LTS or higher
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

