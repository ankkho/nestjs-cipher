import {Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {PiiService} from './pii.service';

/**
 * Simple example demonstrating encryption/decryption with LocalProvider
 * Logs encrypted and decrypted data using NestJS Logger
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Initialize all modules (calls onModuleInit() on services)
  await app.init();

  const logger = new Logger('Example');
  const piiService = app.get(PiiService);

  logger.log('🔐 Starting encryption/decryption example...');

  // Example data
  const plaintext = 'user@example.com';
  const tenantId = 'org-123';

  try {
    // Encrypt
    logger.log(`Encrypting: "${plaintext}"`);
    const encrypted = await piiService.encryptSensitiveData(
      plaintext,
      tenantId,
    );
    logger.log(`Encrypted JSON: ${JSON.stringify(encrypted)}`);

    // Decrypt
    logger.log(`Decrypting...`);
    const decrypted = await piiService.decryptSensitiveData(
      encrypted,
      tenantId,
    );
    logger.log(`Decrypted: "${decrypted}"`);

    logger.log('✅ Example completed successfully');
  } catch (error) {
    logger.error('❌ Example failed');
    logger.error(error);
  }

  // Close the app
  await app.close();
}

(async () => {
  await bootstrap();
})();
