import {describe, expect, it, vi, beforeEach} from 'vitest';
import {Providers, type CipherOptions} from '../interface';
import {GcpKmsProvider} from './gcp.kms';

function createMockClient() {
  return {
    getProjectId: vi.fn().mockResolvedValue('test-project'),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    getCryptoKey: vi.fn(),
    createCryptoKey: vi.fn(),
  } as any;
}

type GcpOptions = Extract<CipherOptions, {provider: Providers.GCP_KMS}>;

function createOptions(): GcpOptions {
  return {
    provider: Providers.GCP_KMS,
    gcp: {
      projectId: 'test-project',
      location: 'global',
      keyRing: 'test-ring',
    },
  };
}

const keyPath =
  'projects/test-project/locations/global/keyRings/test-ring/cryptoKeys/tenant-1';
const dek = Buffer.from('test-dek-material');
const wrappedDek = Buffer.from('wrapped-dek-ciphertext');

describe('GcpKmsProvider', () => {
  it('should be defined', () => {
    expect(GcpKmsProvider).toBeDefined();
  });

  describe('wrap', () => {
    let provider: GcpKmsProvider;
    let mockClient: ReturnType<typeof createMockClient>;

    beforeEach(() => {
      mockClient = createMockClient();
      provider = new GcpKmsProvider(createOptions(), mockClient);
    });

    it('should encrypt DEK via KMS', async () => {
      mockClient.encrypt.mockResolvedValue([
        {ciphertext: Buffer.from('encrypted-dek')},
      ]);

      const result = await provider.wrap(dek, keyPath);

      expect(mockClient.encrypt).toHaveBeenCalledOnce();
      expect(mockClient.encrypt).toHaveBeenCalledWith({
        name: keyPath,
        plaintext: dek,
      });
      expect(result).toEqual(Buffer.from('encrypted-dek'));
    });

    it('should retry on transient errors', async () => {
      mockClient.encrypt
        .mockRejectedValueOnce(new Error('UNAVAILABLE'))
        .mockResolvedValueOnce([{ciphertext: Buffer.from('ok')}]);

      const result = await provider.wrap(dek, keyPath);

      expect(mockClient.encrypt).toHaveBeenCalledTimes(2);
      expect(result).toEqual(Buffer.from('ok'));
    });

    it('should create key on NOT_FOUND and retry encrypt', async () => {
      const notFoundError = new Error('NOT_FOUND');
      (notFoundError as any).code = 5;

      // WithRetry retries 3 times — all must fail so wrap's catch block fires.
      // After createKey, the retry in wrap() calls encrypt again — now succeeds.
      mockClient.encrypt = vi
        .fn()
        .mockRejectedValueOnce(notFoundError)
        .mockRejectedValueOnce(notFoundError)
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce([{ciphertext: Buffer.from('wrapped-dek')}]);

      mockClient.getCryptoKey = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('NOT_FOUND'), {code: 5}));

      mockClient.createCryptoKey = vi.fn().mockResolvedValue([
        {
          name: 'projects/test/locations/global/keyRings/kr/cryptoKeys/tenant-1',
        },
      ]);

      const result = await provider.wrap(dek, keyPath);

      expect(mockClient.createCryptoKey).toHaveBeenCalledOnce();
      expect(result).toEqual(Buffer.from('wrapped-dek'));
    });

    it('should skip creation if key already exists', async () => {
      mockClient.getCryptoKey = vi.fn().mockResolvedValue([
        {
          name: 'projects/test/locations/global/keyRings/kr/cryptoKeys/tenant-1',
        },
      ]);

      mockClient.encrypt = vi
        .fn()
        .mockResolvedValue([{ciphertext: Buffer.from('wrapped-dek')}]);

      const result = await provider.wrap(dek, keyPath);

      expect(mockClient.createCryptoKey).not.toHaveBeenCalled();
      expect(result).toEqual(Buffer.from('wrapped-dek'));
    });

    it('should handle ALREADY_EXISTS race condition', async () => {
      mockClient.getCryptoKey = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('NOT_FOUND'), {code: 5}));

      const alreadyExistsError = new Error('ALREADY_EXISTS');
      (alreadyExistsError as any).code = 6;

      mockClient.createCryptoKey = vi
        .fn()
        .mockRejectedValue(alreadyExistsError);

      // CreateKey is private, call via wrap to trigger it.
      mockClient.encrypt = vi.fn().mockImplementation(async () => {
        const error = new Error('NOT_FOUND');
        (error as any).code = 5;
        throw error;
      });

      await expect(provider.wrap(dek, keyPath)).rejects.toThrow('NOT_FOUND');
      // CreateKey was called (via wrap) but didn't throw despite ALREADY_EXISTS.
      expect(mockClient.createCryptoKey).toHaveBeenCalledOnce();
    });

    it('should rethrow non-NOT_FOUND errors', async () => {
      mockClient.encrypt = vi
        .fn()
        .mockRejectedValue(new Error('PERMISSION_DENIED'));

      await expect(provider.wrap(dek, keyPath)).rejects.toThrow(
        'PERMISSION_DENIED',
      );
      expect(mockClient.createCryptoKey).not.toHaveBeenCalled();
    });
  });

  describe('unwrap', () => {
    let provider: GcpKmsProvider;
    let mockClient: ReturnType<typeof createMockClient>;

    beforeEach(() => {
      mockClient = createMockClient();
      provider = new GcpKmsProvider(createOptions(), mockClient);
    });

    it('should decrypt wrapped DEK via KMS', async () => {
      mockClient.decrypt.mockResolvedValue([
        {plaintext: Buffer.from('decrypted-dek')},
      ]);

      const result = await provider.unwrap(wrappedDek, keyPath);

      expect(mockClient.decrypt).toHaveBeenCalledOnce();
      expect(mockClient.decrypt).toHaveBeenCalledWith({
        name: keyPath,
        ciphertext: wrappedDek,
      });
      expect(result).toEqual(Buffer.from('decrypted-dek'));
    });

    it('should throw descriptive error when key missing', async () => {
      const notFoundError = new Error('NOT_FOUND');
      (notFoundError as any).code = 5;

      mockClient.decrypt = vi.fn().mockRejectedValue(notFoundError);
      mockClient.getCryptoKey = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('NOT_FOUND'), {code: 5}));
      mockClient.createCryptoKey = vi.fn().mockResolvedValue([
        {
          name: 'projects/test/locations/global/keyRings/kr/cryptoKeys/tenant-1',
        },
      ]);

      await expect(provider.unwrap(wrappedDek, keyPath)).rejects.toThrow(
        /cannot be decrypted/v,
      );
      expect(mockClient.createCryptoKey).toHaveBeenCalledOnce();
    });

    it('should rethrow non-NOT_FOUND errors', async () => {
      mockClient.decrypt = vi
        .fn()
        .mockRejectedValue(new Error('INVALID_ARGUMENT'));

      await expect(provider.unwrap(wrappedDek, keyPath)).rejects.toThrow(
        'INVALID_ARGUMENT',
      );
      expect(mockClient.createCryptoKey).not.toHaveBeenCalled();
    });
  });

  describe('generateKeyPath', () => {
    it('should build correct KMS resource path', () => {
      const mockClient = createMockClient();
      const provider = new GcpKmsProvider(createOptions(), mockClient);

      expect(provider.generateKeyPath('tenant-abc')).toBe(
        'projects/test-project/locations/global/keyRings/test-ring/cryptoKeys/tenant-abc',
      );
    });
  });
});
