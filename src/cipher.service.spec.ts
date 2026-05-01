import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CipherService } from './cipher.service';
import type { EncryptedPayload } from './interface';

describe('CipherService', () => {
  let service: CipherService;
  let mockProvider: any;
  let mockCache: any;

  beforeEach(() => {
    mockProvider = {
      generateKeyPath(alias: string) {
        return `projects/test/locations/us/keyRings/kr/cryptoKeys/${alias}`;
      },
      async wrap(dek: Buffer) {
        // Return a copy of the DEK (in real KMS, this would be encrypted)
        return Buffer.from(dek);
      },
      async unwrap(wrapped: Buffer) {
        // In real KMS, this decrypts and returns the DEK
        return Buffer.from(wrapped);
      },
    };

    mockCache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const mockProviderService = {
      getProvider: () => mockProvider,
      getProviderType: () => 'LOCAL',
    } as any;

    service = new CipherService(mockProviderService, mockCache as any);
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

    it('should handle encryption with userId context', async () => {
      const result = await service.encrypt('secret data', { userId: 'user-1' });

      expect(result).toHaveProperty('v', 1);
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('wrappedDek');
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

    it('should successfully round-trip encrypt/decrypt', async () => {
      const plaintext = 'sensitive-data-123';
      const encrypted = await service.encrypt(plaintext, {
        tenantId: 'tenant-1',
      });

      const decrypted = await service.decrypt(encrypted, {
        tenantId: 'tenant-1',
      });

      expect(decrypted).toBe(plaintext);
    });

    it('should handle decrypt with userId context', async () => {
      const plaintext = 'user-secret';
      const encrypted = await service.encrypt(plaintext, { userId: 'user-1' });

      const decrypted = await service.decrypt(encrypted, { userId: 'user-1' });

      expect(decrypted).toBe(plaintext);
    });

    it('should use cached DEK and skip KMS unwrap on second decrypt', async () => {
      const plaintext = 'cached-data';
      const encrypted = await service.encrypt(plaintext, { tenantId: 'tenant-1' });

      // First decrypt: cache miss → unwrap is called and DEK is stored
      const unwrapSpy = vi.spyOn(mockProvider, 'unwrap');
      await service.decrypt(encrypted, {tenantId: 'tenant-1'});
      expect(unwrapSpy).toHaveBeenCalledTimes(1);

      // Capture the DEK that was stored in cache
      const storedDekB64 = mockCache.set.mock.calls[0][1] as string;

      // Second decrypt: cache hit → unwrap is NOT called
      unwrapSpy.mockClear();
      mockCache.get.mockResolvedValueOnce(storedDekB64);

      const decrypted = await service.decrypt(encrypted, { tenantId: 'tenant-1' });

      expect(decrypted).toBe(plaintext);
      expect(unwrapSpy).not.toHaveBeenCalled();
    });

    it('should store unwrapped DEK in cache after first decrypt', async () => {
      const plaintext = 'store-test';
      const encrypted = await service.encrypt(plaintext, { tenantId: 'tenant-1' });

      await service.decrypt(encrypted, { tenantId: 'tenant-1' });

      expect(mockCache.set).toHaveBeenCalledWith(
        `dek:${encrypted.wrappedDek}`,
        expect.any(String),
      );
    });
  });
});
