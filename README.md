# @nestjs-cipher

[![npm version](https://badge.fury.io/js/nestjs-cipher.svg)](https://badge.fury.io/js/nestjs-cipher)
[![CI](https://github.com/ankkho/nestjs-cipher/actions/workflows/test.yml/badge.svg)](https://github.com/ankkho/nestjs-cipher/actions)
[![npm downloads](https://img.shields.io/npm/dm/nestjs-cipher.svg)](https://npm.js.org/package/nestjs-cipher)

Production-grade NestJS encryption module with **envelope encryption** (AES-256-GCM) and **KMS key wrapping** support for secure data protection.

## Features

- ✅ **Envelope encryption** — Local AES-256-GCM encryption with KMS-wrapped key encryption key (KEK)
- ✅ **GCP KMS support** — Secure key wrapping via Google Cloud Key Management Service
- ✅ **Async module registration** — `forRoot()` and `forRootAsync()` with full DI support
- ✅ **Health indicators** — Built-in `CipherHealthIndicator` for Kubernetes probes
- ✅ **Resilient** — Exponential-backoff retry logic on transient KMS errors
- ✅ **Version routing** — Payload versioning for forward-compatible decryption
- ✅ **Secure** — DEK zeroed from memory after use, strongly-typed interfaces

## Installation

```bash
npm install nestjs-cipher @google-cloud/kms @nestjs/terminus nestjs-pino
```

Or with pnpm:

```bash
pnpm add nestjs-cipher @google-cloud/kms @nestjs/terminus nestjs-pino
```

## Quick Start

### 1. Register the module

```typescript
import { Module } from '@nestjs/common';
import { CipherModuleModule, Providers } from 'nestjs-cipher';

@Module({
  imports: [
    CipherModuleModule.forRoot({
      provider: Providers.GCP_KMS,
      gcp: {
        projectId: process.env.GCP_PROJECT_ID!,
        location: 'global', // or 'us'
        keyRing: 'my-keyring',
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Inject and use

```typescript
import { Injectable } from '@nestjs/common';
import { CipherService, Context } from 'nestjs-cipher';

@Injectable()
export class UserService {
  constructor(private readonly cipher: CipherService) {}

  async encryptSensitiveData(data: string, userId: string) {
    const context: Context = { userId };
    return this.cipher.encrypt(data, context);
    // Returns: { v: 1, ciphertext: '...', wrappedDek: '...', iv: '...', tag: '...' }
  }

  async decryptSensitiveData(payload: EncryptedPayload, userId: string) {
    const context: Context = { userId };
    return this.cipher.decrypt(payload, context);
  }
}
```

### 3. Add health check (optional)

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { CipherHealthIndicator } from 'nestjs-cipher';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private cipherHealth: CipherHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.cipherHealth.isHealthy('cipher')]);
  }
}
```

## Configuration

### `CipherOptions`

```typescript
type CipherOptions = {
  provider: Providers.GCP_KMS;
  gcp: {
    projectId: string;        // GCP project ID
    location: string;         // KMS location (e.g., 'global', 'us')
    keyRing: string;          // KMS key ring name
  };
};
```

### Encryption Context

Provide context to derive unique KMS key paths per tenant/user:

```typescript
type Context = {
  tenantId?: string;
  userId?: string;
};
```

## Advanced Usage

### Async Registration

Register with async factory:

```typescript
CipherModuleModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (config: ConfigService) => ({
    provider: Providers.GCP_KMS,
    gcp: {
      projectId: config.get('GCP_PROJECT_ID'),
      location: config.get('GCP_KMS_LOCATION'),
      keyRing: config.get('GCP_KMS_KEYRING'),
    },
  }),
  inject: [ConfigService],
})
```

### Encrypted Payload Format

```typescript
type EncryptedPayload = {
  v: number;              // Payload version (currently 1)
  ciphertext: string;     // Hex-encoded AES-256-GCM ciphertext
  wrappedDek: string;     // Base64-encoded KMS-wrapped DEK
  iv: string;             // Hex-encoded initialization vector
  tag: string;            // Hex-encoded authentication tag
};
```

## How It Works

1. **Key Wrapping** — Data Encryption Key (DEK) is generated locally, encrypted with AES-256-GCM, then the DEK is wrapped by KMS
2. **KMS Resilience** — Transient KMS errors trigger exponential-backoff retry (3 attempts, 100ms base)
3. **Version Routing** — Decrypt switches on `payload.v` to support future format changes without breaking existing data
4. **Memory Safety** — DEK is zeroed from memory immediately after encryption/decryption

## Environment Variables

```bash
# Required
GCP_KMS_CREDENTIALS_PATH=/path/to/service-account-key.json

# Configuration
GCP_PROJECT_ID=my-project
GCP_KMS_LOCATION=global
GCP_KMS_KEYRING=my-keyring
```

## Testing

```bash
pnpm test
```

## License

ISC
