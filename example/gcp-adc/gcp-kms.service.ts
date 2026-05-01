import {Injectable, Logger} from '@nestjs/common';
import {CipherService} from '../../src/cipher.service';
import type {EncryptedPayload} from '../../src/interface';

/**
 * Sample service demonstrating GCP KMS provider usage with ADC
 * Encrypts/decrypts sensitive data via Cloud KMS or emulator
 */
@Injectable()
export class GcpKmsService {
  private readonly logger = new Logger(GcpKmsService.name);

  constructor(private readonly cipher: CipherService) {}

  /**
   * Encrypt sensitive data using GCP KMS
   * - Generates random DEK (Data Encryption Key)
   * - Wraps DEK with GCP KMS
   * - Encrypts plaintext locally with DEK (AES-256-GCM)
   */
  async encryptData(data: string, tenantId: string): Promise<EncryptedPayload> {
    this.logger.log(`🔒 Encrypting data for tenant: ${tenantId}`);
    this.logger.log(`   Plaintext: "${data}"`);

    const payload = await this.cipher.encrypt(data, {tenantId});

    this.logger.log(`✅ Encryption successful`);
    this.logger.log(`   Payload version: ${payload.v}`);
    this.logger.log(`   Ciphertext (base64): ${payload.ciphertext}`);
    this.logger.log(`   Wrapped DEK (base64): ${payload.wrappedDek}`);
    this.logger.log(`   IV (base64): ${payload.iv}`);
    this.logger.log(`   Auth Tag (base64): ${payload.tag}`);
    this.logger.log(`   Full JSON: ${JSON.stringify(payload)}`);

    return payload;
  }

  /**
   * Decrypt sensitive data using GCP KMS
   * - Unwraps DEK via GCP KMS
   * - Decrypts ciphertext locally with DEK
   * - Verifies authentication tag
   */
  async decryptData(
    payload: EncryptedPayload,
    tenantId: string,
  ): Promise<string> {
    this.logger.log(`🔑 Decrypting data for tenant: ${tenantId}`);
    this.logger.log(`   Payload version: ${payload.v}`);

    const decrypted = await this.cipher.decrypt(payload, {tenantId});

    this.logger.log(`✅ Decryption successful`);
    this.logger.log(`   Plaintext: "${decrypted}"`);

    return decrypted;
  }
}
