import {Module} from '@nestjs/common';
import {LoggerModule} from 'nestjs-pino';
import {CipherModule, Providers} from '../src/index';
import {PiiService} from './pii.service';

/**
 * Simple example module with LocalProvider
 * No HTTP server - just encryption/decryption demonstration
 */
@Module({
  imports: [
    LoggerModule.forRoot(),
    CipherModule.forRoot({
      provider: Providers.LOCAL,
    }),
  ],
  providers: [PiiService],
})
export class AppModule {}
