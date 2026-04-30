import {
  DynamicModule,
  FactoryProvider,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {TerminusModule} from '@nestjs/terminus';
import {LoggerModule} from 'nestjs-pino';
import {CipherHealthIndicator} from './cipher.health';
import {CipherService} from './cipher.service';
import {CIPHER_OPTIONS, CipherOptions} from './interface';
import {ProvidersService} from './provider.service';

export type CipherOptionsAsync = Pick<ModuleMetadata, 'imports'> & {
  useFactory: (...args: any[]) => Promise<CipherOptions> | CipherOptions;
  inject?: any[];
};

const CIPHER_PROVIDERS = [
  CipherService,
  ProvidersService,
  CipherHealthIndicator,
];

/** Dynamic encryption module with configurable cryptographic provider (GCP KMS, etc.) */
@Module({})
export class CipherModule {
  static forRoot(options: CipherOptions): DynamicModule {
    return {
      module: CipherModule,
      imports: [ConfigModule, TerminusModule, LoggerModule.forRoot()],
      providers: [
        {provide: CIPHER_OPTIONS, useValue: options},
        ...CIPHER_PROVIDERS,
      ],
      exports: [CIPHER_OPTIONS, ...CIPHER_PROVIDERS],
    };
  }

  static forRootAsync(options: CipherOptionsAsync): DynamicModule {
    return {
      module: CipherModule,
      imports: [
        ConfigModule,
        TerminusModule,
        LoggerModule.forRoot(),
        ...(options.imports ?? []),
      ],
      providers: [
        CipherModule.buildOptionsProvider(options),
        ...CIPHER_PROVIDERS,
      ],
      exports: [CIPHER_OPTIONS, ...CIPHER_PROVIDERS],
    };
  }

  private static buildOptionsProvider(
    options: CipherOptionsAsync,
  ): FactoryProvider {
    return {
      provide: CIPHER_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
  }
}
