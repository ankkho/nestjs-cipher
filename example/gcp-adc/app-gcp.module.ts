import {Module} from '@nestjs/common';
import {LoggerModule} from 'nestjs-pino';
import {CipherModule, Providers} from '../../src/index';
import {GcpKmsService} from './gcp-kms.service';

/**
 * GCP KMS example module with ADC authentication
 * Connects to local GCP KMS emulator or production Cloud KMS
 */
@Module({
  imports: [
    LoggerModule.forRoot(),
    CipherModule.forRoot({
      provider: Providers.GCP_KMS,
      gcp: {
        projectId: process.env.GCP_KMS_PROJECT_ID || 'test-project',
        keyRing: process.env.GCP_KMS_KEY_RING || 'pii-ring',
        location: process.env.GCP_KMS_LOCATION || 'global',
      },
    }),
  ],
  providers: [GcpKmsService],
})
export class AppGcpModule {}
