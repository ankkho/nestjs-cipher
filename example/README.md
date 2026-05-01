# NestJS Cipher example

Simple demonstration of encryption/decryption using the nestjs-cipher package with LocalProvider.

## Files

- **main.ts** - Entry point; encrypts and decrypts data, logs results
- **app.module.ts** - NestJS module setup with LocalProvider
- **pii.service.ts** - Service for encrypting/decrypting sensitive data

## Quick Start

### 1. Run the Example

```bash
pnpm example:dev
```

This will compile and run the example, showing encrypted and decrypted output in the logs.

### 2. Expected Output

```
[Example] 🔐 Starting encryption/decryption example...
[Example] Encrypting: "user@example.com"
[Example] Encrypted JSON: {"v":1,"ciphertext":"...","wrappedDek":"...","iv":"...","tag":"..."}
[Example] Decrypting...
[Example] Decrypted: "user@example.com"
[Example] ✅ Example completed successfully
```

## How It Works

1. **Encrypt** - Takes plaintext and tenantId, returns encrypted JSON
2. **Log** - Logs the encrypted payload using NestJS Logger
3. **Decrypt** - Decrypts the payload using the same tenantId
4. **Log** - Logs the decrypted plaintext

## LocalProvider vs GCP KMS

| Aspect | LocalProvider | GCP KMS |
|--------|---------------|---------|
| Setup | None | Credentials required |
| Speed | Fast (local) | Slower (network) |
| Cost | Free | Pay per request |
| Use Case | Dev/Test | Production |
| Data Security | AES-256-GCM | AES-256-GCM + KMS |

## Production Switch

The `app.module.ts` uses `CipherModule.forRootAsync()` with `ConfigService` to load all configuration via environment variables. This ensures **no hardcoded secrets**.

To use GCP KMS in production, set these environment variables:

```bash
# Required
CIPHER_PROVIDER=GCP_KMS
GCP_KMS_PROJECT_ID=my-project
GCP_KMS_LOCATION=us-central1
GCP_KMS_KEY_RING=pii-ring
GCP_KMS_CREDENTIALS_PATH=/path/to/service-account-key.json
```

Or for local development (default):

```bash
CIPHER_PROVIDER=LOCAL
```

**Why ConfigService?**
- ✅ No hardcoded secrets in source code
- ✅ Environment parity (dev/test/prod)
- ✅ Vault and secret manager integration ready
- ✅ Runtime configuration validation
- ✅ DRY principle (config in one place)

## See Also

- [README](../../nestjs-cipher/README.md) - Full package documentation
- [Source](../../nestjs-cipher/src) - Implementation details
