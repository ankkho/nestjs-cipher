import type { IKeyProvider } from './interface';

/**
 * Local provider: no external key wrapping.
 * DEK is returned as-is; security relies entirely on AES-256-GCM cipher.
 * Use for development, testing, or when KMS is not available.
 */
export class LocalProvider implements IKeyProvider {
  async wrap(dek: Buffer): Promise<Buffer> {
    return dek;
  }

  async unwrap(wrappedDek: Buffer): Promise<Buffer> {
    return wrappedDek;
  }

  generateKeyPath(keyAlias: string): string {
    return keyAlias;
  }
}
