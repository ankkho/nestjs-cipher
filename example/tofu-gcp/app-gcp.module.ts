import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { CipherModule, Providers } from '../../src/index';
import { GcpKmsService } from './gcp-kms.service';

/**
 * GCP KMS Example with ConfigService-driven configuration
 * All environment variables loaded via NestJS ConfigService
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRoot(),
    CipherModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        provider: Providers.GCP_KMS,
        gcp: {
          projectId: config.getOrThrow('GCP_KMS_PROJECT_ID'),
          keyRing: config.getOrThrow('GCP_KMS_KEY_RING'),
          location: config.getOrThrow('GCP_KMS_LOCATION'),
        },
      }),
    }),
  ],
  providers: [GcpKmsService],
})
export class AppGcpModule { }
