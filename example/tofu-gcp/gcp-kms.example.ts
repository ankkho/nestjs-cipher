import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppGcpModule } from './app-gcp.module';
import { GcpKmsService } from './gcp-kms.service';

async function bootstrap() {
  const logger = new Logger('GCP-KMS Example');

  const app = await NestFactory.create(AppGcpModule, {
    logger: ['log', 'error', 'warn'],
  });
  const config = app.get(ConfigService);

  // ConfigService validates required env vars during app initialization
  // If any are missing, forRootAsync().useFactory will throw during module init
  try {
    const projectId = config.getOrThrow('GCP_KMS_PROJECT_ID');
    const keyRing = config.getOrThrow('GCP_KMS_KEY_RING');
    const location = config.getOrThrow('GCP_KMS_LOCATION');
    logger.log(`✓ Using GCP KMS: ${projectId} / ${keyRing} / ${location}`);
  } catch (error) {
    logger.error(`Missing required env vars: ${error}`);
    await app.close();
    process.exit(1);
  }

  const service = app.get(GcpKmsService);
  const tenant = 'org-acme';

  const testCases = ['user@example.com', '+1-555-0100', 'SSN: 123-45-6789'];

  for (const plaintext of testCases) {
    const encrypted = await service.encrypt(plaintext, tenant);
    const decrypted = await service.decrypt(encrypted, tenant);
    logger.log(`${decrypted === plaintext ? '✅' : '❌'} "${plaintext}"`);
  }

  await app.close();
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
