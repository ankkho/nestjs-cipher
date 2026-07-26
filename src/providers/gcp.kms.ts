import {Logger} from '@nestjs/common';
import {
  KeyManagementServiceClient as KmsClient,
  type KeyManagementServiceClient,
} from '@google-cloud/kms';
import {type CipherOptions, type Providers} from '../interface';
import {type IKeyProvider} from './interface';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 100;

/** Retries an async operation with exponential backoff; throws on final failure */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_MS * 2 ** attempt),
        );
      }
    }
  }

  throw lastError;
}

/** GCP KMS provider implementation for key wrapping/unwrapping */
export class GcpKmsProvider implements IKeyProvider {
  /**
   * Factory method: initializes GCP KMS client with ADC and validates credentials
   * @throws On credential initialization or validation failure
   */
  static async create(
    options: Extract<CipherOptions, {provider: Providers.GCP_KMS}>,
  ): Promise<GcpKmsProvider> {
    // Initialize client with Application Default Credentials (ADC)
    // ADC automatically detects credentials from:
    // - GOOGLE_APPLICATION_CREDENTIALS env var
    // - Google Cloud SDK installation
    // - GCP runtime environments (Cloud Run, GKE, Compute Engine)
    const client = new KmsClient();

    // Verify credentials are valid at startup — fail fast before any request
    await client.getProjectId();

    return new GcpKmsProvider(options, client);
  }

  private readonly logger = new Logger(GcpKmsProvider.name);

  private readonly gcp: Extract<
    CipherOptions,
    {provider: Providers.GCP_KMS}
  >['gcp'];

  constructor(
    options: Extract<CipherOptions, {provider: Providers.GCP_KMS}>,
    private readonly client: KeyManagementServiceClient,
  ) {
    this.gcp = options.gcp;
  }

  async wrap(dek: Buffer, keyPath: string): Promise<Buffer> {
    try {
      return await this.encrypt(dek, keyPath);
    } catch (error: any) {
      if (error.code === 5) {
        // NOT_FOUND — key doesn't exist, create it and retry
        await this.createKey(keyPath);
        return this.encrypt(dek, keyPath);
      }

      throw error;
    }
  }

  async unwrap(wrappedDek: Buffer, keyPath: string): Promise<Buffer> {
    try {
      return await this.decrypt(wrappedDek, keyPath);
    } catch (error: any) {
      if (error.code === 5) {
        // Key deleted/missing — create fresh key (can't unwrap old data, but prevents total failure)
        await this.createKey(keyPath);
        throw new Error(
          `KMS key ${keyPath} was missing and has been recreated. Existing encrypted data encrypted with the old key cannot be decrypted. Re-encrypt data with the new key.`,
          {cause: error},
        );
      }

      throw error;
    }
  }

  generateKeyPath(keyAlias: string): string {
    const {projectId, location, keyRing} = this.gcp;
    return `projects/${projectId}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${keyAlias}`;
  }

  private async encrypt(dek: Buffer, keyPath: string): Promise<Buffer> {
    const [response] = await withRetry(async () =>
      this.client.encrypt({name: keyPath, plaintext: dek}),
    );
    return response.ciphertext as Buffer;
  }

  private async decrypt(wrappedDek: Buffer, keyPath: string): Promise<Buffer> {
    const [response] = await withRetry(async () =>
      this.client.decrypt({name: keyPath, ciphertext: wrappedDek}),
    );
    return response.plaintext as Buffer;
  }

  /**
   * Creates a KMS crypto key with sensible defaults.
   * Idempotent: checks if key exists first, catches ALREADY_EXISTS for race conditions.
   */
  private async createKey(keyPath: string): Promise<void> {
    const keyName = keyPath.split('/').pop()!;
    const parent = keyPath.slice(0, keyPath.lastIndexOf('/cryptoKeys/'));

    const [existingKey] = await this.client
      .getCryptoKey({name: keyPath})
      .catch(() => [null]); // NOT_FOUND → proceed with creation

    if (existingKey) {
      this.logger.debug(`Key already exists: ${keyName}`);
      return;
    }

    this.logger.log(`Auto-creating KMS key: ${keyName}`);

    try {
      const [key] = await this.client.createCryptoKey({
        parent,
        cryptoKeyId: keyName,
        cryptoKey: {
          purpose: 'ENCRYPT_DECRYPT',
          versionTemplate: {
            algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
            protectionLevel: 'SOFTWARE',
          },
          rotationPeriod: {seconds: 90 * 24 * 60 * 60},
          nextRotationTime: {
            seconds: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
          },
        },
      });

      this.logger.log(`KMS key created: ${key.name}`);
    } catch (error: any) {
      if (error.code === 6) {
        // ALREADY_EXISTS — another process created it concurrently, safe to ignore
        this.logger.debug(`Key already exists (race condition): ${keyName}`);
        return;
      }

      throw error;
    }
  }
}
