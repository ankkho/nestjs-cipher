import {Injectable, Logger} from '@nestjs/common';
import {CipherService} from '../src/cipher.service';
import type {EncryptedPayload} from '../src/interface';

/**
 * Sample service demonstrating LocalProvider usage for development/testing
 */
@Injectable()
export class PiiService {
  private readonly logger = new Logger(PiiService.name);

  constructor(private readonly cipher: CipherService) {}

  /**
   * Encrypt sensitive data using local provider (no KMS calls)
   */
  async encryptSensitiveData(
    data: string,
    tenantId: string,
  ): Promise<EncryptedPayload> {
    const payload = await this.cipher.encrypt(data, {tenantId});
    this.logger.debug(`Encrypted payload: ${JSON.stringify(payload)}`);
    return payload;
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(
    payload: EncryptedPayload,
    tenantId: string,
  ): Promise<string> {
    const decrypted = await this.cipher.decrypt(payload, {tenantId});
    this.logger.debug(`Decrypted: ${decrypted}`);
    return decrypted;
  }
}
