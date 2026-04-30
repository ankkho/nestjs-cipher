import type {IKeyProvider} from './interface';

/**
 * Local provider: no external key wrapping.
 * DEK is returned as-is; security relies entirely on AES-256-GCM cipher.
 * Use for development, testing, or when KMS is not available.
 *
 * NOTE: Returns a copy of the buffer to avoid issues with buffer zeroing
 */
export class LocalProvider implements IKeyProvider {
  async wrap(dek: Buffer): Promise<Buffer> {
    // Return a copy to avoid the wrapped DEK being zeroed when dek is cleared
    return Buffer.from(dek);
  }

  async unwrap(wrappedDek: Buffer): Promise<Buffer> {
    // Return a copy for consistency
    return Buffer.from(wrappedDek);
  }

  generateKeyPath(keyAlias: string): string {
    return keyAlias;
  }
}
