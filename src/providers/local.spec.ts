import {describe, expect, it} from 'vitest';
import {LocalProvider} from './local';

describe('LocalProvider', () => {
  it('should wrap and unwrap DEK without modification', async () => {
    const provider = new LocalProvider();
    const dek = Buffer.from('test-key-material');

    const wrapped = await provider.wrap(dek);
    const unwrapped = await provider.unwrap(wrapped);

    expect(wrapped).toEqual(dek);
    expect(unwrapped).toEqual(dek);
  });

  it('should generate key path from alias', () => {
    const provider = new LocalProvider();

    expect(provider.generateKeyPath('tenant-123')).toBe('tenant-123');
    expect(provider.generateKeyPath('user-456')).toBe('user-456');
  });
});
