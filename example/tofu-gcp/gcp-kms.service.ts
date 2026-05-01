import { Injectable } from '@nestjs/common';
import { CipherService } from '../../src/cipher.service';
import type { EncryptedPayload } from '../../src/interface';

@Injectable()
export class GcpKmsService {
  constructor(private readonly cipher: CipherService) { }

  encrypt(data: string, tenantId: string): Promise<EncryptedPayload> {
    return this.cipher.encrypt(data, { tenantId });
  }

  decrypt(payload: EncryptedPayload, tenantId: string): Promise<string> {
    return this.cipher.decrypt(payload, { tenantId });
  }
}
