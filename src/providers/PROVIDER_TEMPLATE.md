# Adding a New Provider

This guide walks contributors through adding a new cryptographic provider to `@nestjs-cipher`.

## Directory Structure

```
src/
├── providers/
│   ├── interface.ts           # IKeyProvider interface (required)
│   ├── gcp.kms.ts             # GCP KMS implementation
│   └── YOUR_PROVIDER.ts       # Your provider implementation
├── interface.ts               # CipherOptions, Providers enum
└── provider.service.ts        # Provider initialization
```

## Steps to Add a New Provider

### 1. Define the Provider Enum

Edit `src/interface.ts`:

```typescript
export enum Providers {
  GCP_KMS = 'GCP_KMS',
  AWS_KMS = 'AWS_KMS',  // New provider
}
```

### 2. Extend CipherOptions Union

Edit `src/interface.ts`:

```typescript
export type CipherOptions = 
  | {
      provider: Providers.GCP_KMS;
      gcp: { projectId: string; location: string; keyRing: string };
    }
  | {
      provider: Providers.AWS_KMS;
      aws: { region: string; keyId: string };  // New provider config
    };
```

### 3. Implement IKeyProvider

Create `src/providers/aws.kms.ts`:

```typescript
import { IKeyProvider } from './interface';

export class AwsKmsProvider implements IKeyProvider {
  constructor(private readonly options: CipherOptions, private readonly client: any) {}

  async wrap(dek: Buffer, keyPath: string): Promise<Buffer> {
    // Implement KMS key wrapping
  }

  async unwrap(wrappedDek: Buffer, keyPath: string): Promise<Buffer> {
    // Implement KMS key unwrapping
  }

  generateKeyPath(keyAlias: string): string {
    // Generate KMS key ARN or path
    return `arn:aws:kms:${this.options.aws.region}:...`;
  }
}
```

### 4. Update ProviderService

Edit `src/provider.service.ts` `initProvider()` method:

```typescript
async initProvider() {
  switch (this.provider) {
    case Providers.GCP_KMS: {
      // Existing GCP implementation
      break;
    }
    case Providers.AWS_KMS: {
      const client = new KMS({ region: this.options.aws.region });
      await client.describeKey({ KeyId: this.options.aws.keyId }).promise();
      this.providerInstance = new AwsKmsProvider(this.options, client);
      break;
    }
  }
}
```

### 5. Add Tests

Create `src/providers/aws.kms.spec.ts`:

```typescript
describe('AwsKmsProvider', () => {
  it('wraps and unwraps DEK symmetrically', async () => {
    // Test implementation
  });
});
```

### 6. Update Documentation

Update `README.md` to document the new provider configuration.

## IKeyProvider Interface

Your provider must implement:

```typescript
export interface IKeyProvider {
  wrap(dek: Buffer, keyPath: string): Promise<Buffer>;
  unwrap(wrappedDek: Buffer, keyPath: string): Promise<Buffer>;
  generateKeyPath(keyAlias: string): string;
}
```

## Best Practices

- ✅ Add retry logic for transient failures
- ✅ Log initialization and errors via PinoLogger
- ✅ Validate credentials at startup (fail fast)
- ✅ Zero sensitive buffers after use
- ✅ Write tests for wrap/unwrap operations
- ✅ Follow conventional commits (feat, fix, docs)

## Questions?

See [CONTRIBUTING.md](../../CONTRIBUTING.md) or open an issue.
