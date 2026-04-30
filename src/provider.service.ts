import { KeyManagementServiceClient } from '@google-cloud/kms';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { CIPHER_OPTIONS, CipherOptions, Providers } from './interface';
import { GcpKmsProvider } from './providers/gcp.kms';
import { IKeyProvider } from './providers/interface';
import { LocalProvider } from './providers/local';

/**
 * ProvidersService
 *
 * This NestJS service abstracts cryptographic provider initialization and access.
 * Currently supports Google Cloud KMS (GCP_KMS) as a backend for encryption key management.
 *
 * - On module init, initializes the provider client (e.g., GCP KMS) using credentials from config.
 * - Provides a method to retrieve the initialized provider client for cryptographic operations.
 * - Throws InternalServerErrorException if the provider is not supported or initialization fails.
 *
 * Usage:
 *   Inject ProvidersService and call getClient() to access the KMS client.
 */
@Injectable()
export class ProvidersService implements OnModuleInit {
  private gcpClient!: KeyManagementServiceClient;
  private readonly provider!: Providers;
  private providerInstance!: IKeyProvider;

  constructor(
    @Inject(CIPHER_OPTIONS) private readonly options: CipherOptions,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProvidersService.name);
    this.logger.assign({ provider: options.provider });
    this.provider = this.options.provider;
  }

  async onModuleInit() {
    try {
      await this.initProvider();
      this.logger.info(
        { provider: this.provider },
        'KMS Provider initialized successfully',
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize GCP KMS Provider');
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
        this.gcpClient = new KeyManagementServiceClient({
          keyFilename: this.config.get<string>('GCP_KMS_CREDENTIALS_PATH')!,
        });
        // Verify credentials are valid at startup — fail fast before any request
        await this.gcpClient.getProjectId();
        this.providerInstance = new GcpKmsProvider(
          this.options,
          this.gcpClient,
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
}
