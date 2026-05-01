import {Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AppGcpModule} from './app-gcp.module';
import {GcpKmsService} from './gcp-kms.service';

/**
 * GCP KMS emulator example with ADC
 *
 * Prerequisites:
 * 1. Start emulator: docker run -d -p 9090:9090 gcr.io/gcloud-release/cloud-kms:latest
 * 2. Set environment:
 *    export PUBSUB_EMULATOR_HOST=localhost:9090
 *    export GCP_KMS_PROJECT_ID=test-project
 *    export GCP_KMS_KEY_RING=pii-ring
 *    export GCP_KMS_LOCATION=global
 * 3. Run: pnpm example:gcp
 */
async function bootstrap() {
  const logger = new Logger('GCP-KMS Example');

  logger.log('━'.repeat(60));
  logger.log('🌍 GCP KMS with ADC Example');
  logger.log('━'.repeat(60));

  // Validate environment
  const projectId = process.env.GCP_KMS_PROJECT_ID;
  const keyRing = process.env.GCP_KMS_KEY_RING;
  const location = process.env.GCP_KMS_LOCATION;

  if (!projectId || !keyRing || !location) {
    logger.error('❌ Missing required environment variables:');
    logger.error(`   GCP_KMS_PROJECT_ID: ${projectId || 'NOT SET'}`);
    logger.error(`   GCP_KMS_KEY_RING: ${keyRing || 'NOT SET'}`);
    logger.error(`   GCP_KMS_LOCATION: ${location || 'NOT SET'}`);
    process.exit(1);
  }

  logger.log(`📍 Configuration:`);
  logger.log(`   Project ID: ${projectId}`);
  logger.log(`   Key Ring: ${keyRing}`);
  logger.log(`   Location: ${location}`);

  if (process.env.PUBSUB_EMULATOR_HOST) {
    logger.log(`   Emulator Host: ${process.env.PUBSUB_EMULATOR_HOST}`);
  }

  logger.log('');

  try {
    // Initialize NestJS app
    logger.log('🚀 Initializing NestJS application...');
    const app = await NestFactory.create(AppGcpModule, {
      logger: ['log', 'error', 'warn'],
    });

    // Initialize modules (triggers KMS credential validation)
    await app.init();
    logger.log('✅ Application initialized\n');

    // Get service
    const gcpService = app.get(GcpKmsService);

    // Test data
    const testCases = [
      {plaintext: 'user@example.com', tenantId: 'org-acme'},
      {plaintext: '+1-555-0100', tenantId: 'org-acme'},
      {plaintext: 'SSN: 123-45-6789', tenantId: 'org-contoso'},
    ];

    // Process each test case
    for (const {plaintext, tenantId} of testCases) {
      logger.log('');
      logger.log('─'.repeat(60));

      // Encrypt
      const encrypted = await gcpService.encryptData(plaintext, tenantId);

      logger.log('');

      // Decrypt
      const decrypted = await gcpService.decryptData(encrypted, tenantId);

      // Verify
      if (decrypted === plaintext) {
        logger.log(`✨ ✅ Round-trip successful: "${plaintext}" → encrypt → decrypt`);
      } else {
        logger.error(`❌ Mismatch! Expected "${plaintext}", got "${decrypted}"`);
      }
    }

    logger.log('');
    logger.log('━'.repeat(60));
    logger.log('✅ All tests completed successfully!');
    logger.log('━'.repeat(60));

    // Cleanup
    await app.close();
  } catch (error) {
    logger.error('❌ Error during example execution:');
    logger.error(error);
    process.exit(1);
  }
}

(async () => {
  await bootstrap();
})();
