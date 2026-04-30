import { type InjectionToken } from '@nestjs/common';

/** Supported KMS providers for key wrapping */
export enum Providers {
  LOCAL = 'LOCAL',
  GCP_KMS = 'GCP_KMS',
}

/** Typed injection token — prevents silent overwrites from plain string tokens */
export const CIPHER_OPTIONS: InjectionToken<CipherOptions> =
  Symbol('CIPHER_OPTIONS');

/** Discriminated union ensures gcp config is required when provider is GCP_KMS */
export type CipherOptions =
  | {
    provider: Providers.LOCAL;
  }
  | {
    provider: Providers.GCP_KMS;
    gcp: {
      projectId: string;
      location: string;
      keyRing: string;
    };
  };

/** Encryption context for tenant/user isolation via KMS key path generation */
export type Context = {
  tenantId?: string;
  userId?: string;
};

/** Strongly-typed encrypted payload returned by CipherService.encrypt() */
export type EncryptedPayload = {
  v: number;
  ciphertext: string;
  wrappedDek: string;
  iv: string;
  tag: string;
};
