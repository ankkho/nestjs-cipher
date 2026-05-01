import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {CIPHER_OPTIONS, CipherOptions, Providers} from './interface';
import {GcpKmsProvider} from './providers/gcp.kms';
import {IKeyProvider} from './providers/interface';
import {LocalProvider} from './providers/local';

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
  private readonly logger = new Logger(ProviderService.name);

  constructor(@Inject(CIPHER_OPTIONS) private readonly options: CipherOptions) {
    this.provider = this.options.provider;
  }

  async onModuleInit() {
    try {
      await this.initProvider();
      this.logger.log('KMS Provider initialized successfully', {
        provider: this.provider,
      });
    } catch (error) {
      this.logger.error('Failed to initialize KMS Provider', {error});
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
          this.options as Extract<CipherOptions, {provider: Providers.GCP_KMS}>,
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
