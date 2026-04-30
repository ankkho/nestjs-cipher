/** Abstract interface for KMS provider implementations */
export type IKeyProvider = {
  wrap(key: Buffer, keyPath: string): Promise<Buffer>;
  unwrap(wrappedDek: Buffer, keyPath: string): Promise<Buffer>;
  generateKeyPath(keyAlias: string): string;
};
