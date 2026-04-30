import {describe, expect, it} from 'vitest';
import {GcpKmsProvider} from './gcp.kms';

describe('GcpKmsProvider', () => {
  it('should be defined', () => {
    expect(GcpKmsProvider).toBeDefined();
  });
});
