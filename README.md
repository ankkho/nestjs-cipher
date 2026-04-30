# nestjs-cipher

Production-grade NestJS encryption module for PII protection using AES-256-GCM locally with optional GCP Cloud KMS key wrapping.

## Features

- **Envelope Encryption:** Local AES-256-GCM with optional GCP KMS integration
- **Secure:** DEK (Data Encryption Key) zeroed from memory after each operation
- **Multi-Tenant:** Automatic tenant/user-level key isolation
- **Typed:** Full TypeScript support with strict types
- **Fast:** ~10-20ms per operation (local crypto + KMS round-trip)
- **Observable:** Structured logging + health checks
- **Tested:** 11 comprehensive unit tests, production CI/CD

## Quick Start

### Install

```bash
pnpm installnestjs-cipher
```

### Register Module

```typescript
import { CipherModule, Providers } from '@eventing/cipher-module';

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
import { CipherService } from '@eventing/cipher-module';
import type { EncryptedPayload } from '@eventing/cipher-module';

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

## Testing with cURL

### Start the example server

```bash
pnpm examples:dev
```

### POST - Encrypt Data

```bash
curl -X POST http://localhost:3000/pii/encrypt \
  -H "Content-Type: application/json" \
  -d '{"data":"user@example.com","tenantId":"org-123"}'
```

**Response:**
```json
{
  "encrypted": "{\"v\":1,\"ciphertext\":\"i0nlicuMdPiemZ8B+IrG4w==\",\"wrappedDek\":\"AAAA...\",\"iv\":\"9jR1YiR6nOO0aUd9fyf9\",\"tag\":\"...\"}"
}
```

### GET - Decrypt Data

```bash
# Option 1: Using captured encrypted value from POST
ENCRYPTED=$(curl -s -X POST http://localhost:3000/pii/encrypt \
  -H "Content-Type: application/json" \
  -d '{"data":"user@example.com","tenantId":"org-123"}' | jq -r '.encrypted')

curl -X GET "http://localhost:3000/pii/decrypt?encryptedJson=$ENCRYPTED&tenantId=org-123"
```

**Response:**
```json
{
  "decrypted": "user@example.com"
}
```

### Quick Test (inline)

```bash
curl -X GET 'http://localhost:3000/pii/decrypt?encryptedJson=%7B%22v%22%3A1%2C%22ciphertext%22%3A%22test%22%2C%22wrappedDek%22%3A%22test%22%2C%22iv%22%3A%22test%22%2C%22tag%22%3A%22test%22%7D&tenantId=org-123'
```

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

## Configuration

Set environment variables:

```bash
# Required
GCP_KMS_PROJECT_ID=my-project
GCP_KMS_KEY_RING=pii-ring

# Optional (defaults to europe-west3)
GCP_KMS_LOCATION=us-central1
GCP_KMS_CREDENTIALS_PATH=/path/to/key.json
```

**Validation:** All required fields are verified at module startup — fails fast on misconfiguration.

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

## Multi-Tenant Security

Each tenant maps to a distinct KMS key:

```
tenantId: 'org-100' → .../cryptoKeys/tenant-org-100
userId: 'usr-42'    → .../cryptoKeys/user-usr-42
```

**Result:** Tenant A cannot decrypt Tenant B's data (different KMS keys).

## Security Best Practices

1. ✅ Store credentials in env vars; never commit keys
2. ✅ Grant service account only `roles/cloudkms.cryptographer` (least privilege)
3. ✅ Enable automatic key rotation (90 days recommended)
4. ✅ DEK zeroed from memory after each operation
5. ✅ Use transport security (TLS) for all KMS communication

## Troubleshooting

| Issue                       | Solution                                              |
| --------------------------- | ----------------------------------------------------- |
| `Provider not initialized`  | Check `GCP_KMS_CREDENTIALS_PATH` + service account IAM |
| `PERMISSION_DENIED`         | Add `roles/cloudkms.cryptographer` to service account  |
| Decryption fails            | Verify same context (`tenantId`/`userId`) used        |
| High latency (>50ms)        | Check GCP connectivity; monitor KMS quotas            |

## Development

```bash
# Install
pnpm install

# Test
pnpm test

# Lint
pnpm lint:fix

# Build
pnpm build
```

## License

MIT
