import {
  Inject,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CIPHER_OPTIONS, CipherOptions, Providers } from './interface';
import { GcpKmsProvider } from './providers/gcp.kms';
import { IKeyProvider } from './providers/interface';
import { LocalProvider } from './providers/local';

/**
 * ProviderService
 *
 * This NestJS service abstracts cryptographic provider initialization and access.
 * Currently supports Google Cloud KMS (GCP_KMS) as a backend for encryption key management.
 *
 * - On module init, initializes the provider (e.g., GCP KMS) using credentials from environment.
 * - Provides a method to retrieve the initialized provider for cryptographic operations.
 * - Throws InternalServerErrorException if the provider is not supported or initialization fails.
 *
 * Usage:
 *   Inject ProviderService and call getProvider() to access the KMS provider.
 */
@Injectable()
export class ProviderService implements OnModuleInit {
  private readonly provider!: Providers;
  private providerInstance!: IKeyProvider;

  constructor(
    @Inject(CIPHER_OPTIONS) private readonly options: CipherOptions,
    private readonly logger: PinoLogger,
  ) {
    if (this.logger) {
      this.logger.setContext(ProviderService.name);
    }

    this.provider = this.options.provider;
  }

  async onModuleInit() {
    try {
      await this.initProvider();
      if (this.logger) {
        this.logger.info(
          { provider: this.provider },
          'KMS Provider initialized successfully',
        );
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error({ error }, 'Failed to initialize KMS Provider');
      }

      throw new InternalServerErrorException(
        'Cryptographic Provider Initialization Failed',
      );
    }
  }

  async initProvider() {
    switch (this.provider) {
      case Providers.LOCAL: {
        this.providerInstance = new LocalProvider();
        break;
      }

      case Providers.GCP_KMS: {
        this.providerInstance = await GcpKmsProvider.create(
          this.options as Extract<CipherOptions, { provider: Providers.GCP_KMS }>,
        );
        break;
      }
    }
  }

  getProvider(): IKeyProvider {
    if (!this.providerInstance) {
      throw new InternalServerErrorException('Provider not initialized');
    }

    return this.providerInstance;
  }

  getProviderType(): string {
    return this.provider;
  }
}
