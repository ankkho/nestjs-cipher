import {type KeyManagementServiceClient} from '@google-cloud/kms';
import {type CipherOptions} from '../interface';
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
  constructor(
    private readonly options: CipherOptions,
    private readonly client: KeyManagementServiceClient,
  ) {
    // Gcp is guaranteed non-null by the discriminated union in CipherOptions
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
    const {projectId, location, keyRing} = this.options.gcp;
    return `projects/${projectId}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${keyAlias}`;
  }
}
