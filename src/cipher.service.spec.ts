import { beforeEach, describe, expect, it } from 'vitest';
import { CipherService } from './cipher.service';
import type { EncryptedPayload } from './interface';

describe('CipherService', () => {
  let service: CipherService;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      generateKeyPath(alias: string) {
        return `projects/test/locations/us/keyRings/kr/cryptoKeys/${alias}`;
      },
      async wrap(dek: Buffer) {
        return dek;
      },
      async unwrap(wrapped: Buffer) {
        return wrapped;
      },
    };

    const mockProvidersService = {
      getProvider: () => mockProvider,
      getProviderType: () => 'LOCAL',
    } as any;

    service = new CipherService(mockProvidersService);
  });

  describe('encrypt', () => {
    it('should encrypt plaintext and return EncryptedPayload', async () => {
      const result = await service.encrypt('secret data', {
        tenantId: 'tenant-1',
      });

      expect(result).toHaveProperty('v', 1);
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('wrappedDek');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
    });

    it('should return base64-encoded fields', async () => {
      const result = await service.encrypt('data', { tenantId: 'tenant-1' });

      expect(typeof result.ciphertext).toBe('string');
      expect(typeof result.wrappedDek).toBe('string');
      expect(typeof result.iv).toBe('string');
      expect(typeof result.tag).toBe('string');
    });

    it('should handle unicode plaintext', async () => {
      const result = await service.encrypt('Hello 世界 🌍', {
        tenantId: 'tenant-1',
      });

      expect(result.v).toBe(1);
      expect(result.ciphertext).toBeDefined();
    });

    it('should throw if provider wrap fails', async () => {
      mockProvider.wrap = async () => {
        throw new Error('KMS error');
      };

      await expect(
        service.encrypt('data', { tenantId: 'tenant-1' }),
      ).rejects.toThrow('KMS error');
    });
  });

  describe('decrypt', () => {
    it('should accept v1 payload structure', async () => {
      const encrypted = await service.encrypt('test', { tenantId: 'tenant-1' });

      expect(encrypted.v).toBe(1);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.wrappedDek).toBeDefined();
    });

    it('should throw on unsupported payload version', async () => {
      const invalid: EncryptedPayload = {
        v: 999,
        ciphertext: 'data',
        wrappedDek: 'data',
        iv: 'data',
        tag: 'data',
      };

      await expect(
        service.decrypt(invalid, { tenantId: 'tenant-1' }),
      ).rejects.toThrow('Unsupported payload version');
    });

    it('should throw if provider unwrap fails', async () => {
      mockProvider.unwrap = async () => {
        throw new Error('KMS unwrap failed');
      };

      const encrypted = await service.encrypt('data', { tenantId: 'tenant-1' });

      await expect(
        service.decrypt(encrypted, { tenantId: 'tenant-1' }),
      ).rejects.toThrow('KMS unwrap failed');
    });
  });
});
