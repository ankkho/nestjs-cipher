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
    const [response] = await withRetry(async () =>
      this.client.encrypt({name: keyPath, plaintext: dek}),
    );
    return response.ciphertext as Buffer;
  }

  async unwrap(wrappedDek: Buffer, keyPath: string): Promise<Buffer> {
    const [response] = await withRetry(async () =>
      this.client.decrypt({name: keyPath, ciphertext: wrappedDek}),
    );
    return response.plaintext as Buffer;
  }

  generateKeyPath(keyAlias: string): string {
    const {projectId, location, keyRing} = this.gcp;
    return `projects/${projectId}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${keyAlias}`;
  }
}
