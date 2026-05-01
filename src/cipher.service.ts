import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {SpanStatusCode, trace} from '@opentelemetry/api';
import {Context, EncryptedPayload} from './interface';
import {ProviderService} from './provider.service';
import {buildKeyAlias} from './utils';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const CURRENT_PAYLOAD_VERSION = 1;

const tracer = trace.getTracer('nestjs-cipher');

@Injectable()
export class CipherService {
  constructor(private readonly ProviderService: ProviderService) {}

  /**
   * Encrypt data using envelope encryption (AES-256-GCM + KMS-wrapped DEK)
   * 1. Generate random data encryption key (DEK)
   * 2. Wrap DEK with KMS
   * 3. Encrypt plaintext with DEK
   * @returns Encrypted payload with wrapped DEK and metadata
   */
  async encrypt(
    plaintext: string,
    context: Context,
  ): Promise<EncryptedPayload> {
    const span = tracer.startSpan('nestjs-cipher.encrypt', {
      attributes: {
        'cipher.provider': this.ProviderService.getProviderType(),
        'cipher.context.type': context.tenantId ? 'tenant' : 'user',
      },
    });

    try {
      // Generate random DEK (32 bytes for AES-256)
      const dek = randomBytes(32);

      // Generate random IV
      const iv = randomBytes(IV_LENGTH);

      // Get KMS provider and wrap DEK
      const provider = this.ProviderService.getProvider();
      const keyAlias = buildKeyAlias(context);
      const keyPath = provider.generateKeyPath(keyAlias);

      const wrappedDek = await provider.wrap(dek, keyPath);

      // Encrypt plaintext with DEK
      const cipher = createCipheriv(ALGORITHM, dek, iv);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      // Zero out DEK from memory
      dek.fill(0);

      span.setStatus({code: SpanStatusCode.OK});

      // Encode to base64 for JSON serialization
      return {
        v: CURRENT_PAYLOAD_VERSION,
        ciphertext: ciphertext.toString('base64'),
        wrappedDek: wrappedDek.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      span.setStatus({code: SpanStatusCode.ERROR, message: String(error)});
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Decrypt envelope-encrypted payload
   * 1. Decode base64 payload
   * 2. Route to versioned handler based on payload.v
   * 3. Unwrap DEK with KMS
   * 4. Decrypt ciphertext with DEK
   */
  async decrypt(payload: EncryptedPayload, context: Context): Promise<string> {
    const span = tracer.startSpan('nestjs-cipher.decrypt', {
      attributes: {
        'cipher.provider': this.ProviderService.getProviderType(),
        'cipher.context.type': context.tenantId ? 'tenant' : 'user',
        'cipher.payload.version': payload.v,
      },
    });

    try {
      let result: string;

      // Route to version-specific handler
      switch (payload.v) {
        case 1: {
          result = await this.decryptV1(payload, context);
          break;
        }

        default: {
          throw new Error(`Unsupported payload version: ${payload.v}`);
        }
      }

      span.setStatus({code: SpanStatusCode.OK});
      return result;
    } catch (error) {
      span.setStatus({code: SpanStatusCode.ERROR, message: String(error)});
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Decrypt v1 payload (current version)
   */
  private async decryptV1(
    payload: EncryptedPayload,
    context: Context,
  ): Promise<string> {
    // Decode base64 fields
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    const wrappedDek = Buffer.from(payload.wrappedDek, 'base64');
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');

    // Get KMS provider and unwrap DEK
    const provider = this.ProviderService.getProvider();
    const keyAlias = buildKeyAlias(context);
    const keyPath = provider.generateKeyPath(keyAlias);

    const dek = await provider.unwrap(wrappedDek, keyPath);

    try {
      // Decrypt ciphertext with DEK
      const decipher = createDecipheriv(ALGORITHM, dek, iv);
      decipher.setAuthTag(tag);

      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');

      return plaintext;
    } finally {
      // Zero out DEK from memory
      dek.fill(0);
    }
  }
}
