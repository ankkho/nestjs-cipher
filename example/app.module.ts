import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { CipherModule, Providers } from '../src/index';
import { PiiService } from './pii.service';

/**
 * Example module demonstrating ConfigService-driven configuration
 * All environment variables loaded via NestJS ConfigService
 * No HTTP server - just encryption/decryption demonstration
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRoot(),
    CipherModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.getOrThrow<string>('CIPHER_PROVIDER');

        if (provider === Providers.GCP_KMS) {
          return {
            provider: Providers.GCP_KMS,
            gcp: {
              projectId: config.getOrThrow('GCP_KMS_PROJECT_ID'),
              location: config.getOrThrow('GCP_KMS_LOCATION'),
              keyRing: config.getOrThrow('GCP_KMS_KEY_RING'),
            },
          };
        }

        // Default to LOCAL for development
        return {
          provider: Providers.LOCAL,
        };
      },
    }),
  ],
  providers: [PiiService],
})
export class AppModule { }
