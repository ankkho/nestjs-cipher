import {describe, expect, it} from 'vitest';
import {buildKeyAlias} from './utils';

describe('buildKeyAlias', () => {
  describe('happy paths', () => {
    it('should generate tenant key alias when tenantId is provided', () => {
      const alias = buildKeyAlias({tenantId: 'tenant-123'});
      expect(alias).toBe('tenant-tenant-123');
    });

    it('should generate user key alias when userId is provided', () => {
      const alias = buildKeyAlias({userId: 'user-456'});
      expect(alias).toBe('user-user-456');
    });

    it('should prefer tenantId when both tenantId and userId are provided', () => {
      const alias = buildKeyAlias({tenantId: 'tenant-123', userId: 'user-456'});
      expect(alias).toBe('tenant-tenant-123');
    });
  });

  describe('edge cases', () => {
    it('should handle tenantId with special characters', () => {
      const alias = buildKeyAlias({tenantId: 'tenant-abc_123-xyz'});
      expect(alias).toBe('tenant-tenant-abc_123-xyz');
    });

    it('should handle userId with special characters', () => {
      const alias = buildKeyAlias({userId: 'user-abc_123-xyz'});
      expect(alias).toBe('user-user-abc_123-xyz');
    });

    it('should handle numeric tenantId', () => {
      const alias = buildKeyAlias({tenantId: '123456'});
      expect(alias).toBe('tenant-123456');
    });

    it('should handle numeric userId', () => {
      const alias = buildKeyAlias({userId: '789012'});
      expect(alias).toBe('user-789012');
    });

    it('should handle empty string tenantId as falsy', () => {
      const alias = buildKeyAlias({tenantId: '', userId: 'user-456'});
      expect(alias).toBe('user-user-456');
    });

    it('should handle empty string userId as falsy', () => {
      const alias = buildKeyAlias({tenantId: 'tenant-123', userId: ''});
      expect(alias).toBe('tenant-tenant-123');
    });

    it('should handle very long tenantId', () => {
      const longId = 'a'.repeat(1000);
      const alias = buildKeyAlias({tenantId: longId});
      expect(alias).toBe(`tenant-${longId}`);
    });

    it('should handle very long userId', () => {
      const longId = 'b'.repeat(1000);
      const alias = buildKeyAlias({userId: longId});
      expect(alias).toBe(`user-${longId}`);
    });
  });

  describe('error cases', () => {
    it('should throw when neither tenantId nor userId is provided', () => {
      expect(() => buildKeyAlias({})).toThrow(
        'At least one of tenantId or userId must be provided in context',
      );
    });

    it('should throw when both tenantId and userId are undefined', () => {
      expect(() => buildKeyAlias({tenantId: undefined, userId: undefined})).toThrow(
        'At least one of tenantId or userId must be provided in context',
      );
    });

    it('should throw when both tenantId and userId are empty strings', () => {
      expect(() => buildKeyAlias({tenantId: '', userId: ''})).toThrow(
        'At least one of tenantId or userId must be provided in context',
      );
    });

    it('should throw when context is null', () => {
      // @ts-expect-error testing runtime behavior
      expect(() => buildKeyAlias(null)).toThrow();
    });

    it('should throw when context is undefined', () => {
      // @ts-expect-error testing runtime behavior
      expect(() => buildKeyAlias(undefined)).toThrow();
    });
  });
});
