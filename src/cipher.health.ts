import {Injectable} from '@nestjs/common';
import {HealthIndicatorResult, HealthIndicatorService} from '@nestjs/terminus';
import {ProviderService} from './provider.service';

/** Health indicator that verifies the KMS provider is operational */
@Injectable()
export class CipherHealthIndicator {
  constructor(
    private readonly ProviderService: ProviderService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  isHealthy(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    try {
      // Confirm the provider is initialized (throws if not)
      this.ProviderService.getProvider();
      return indicator.up();
    } catch (error) {
      return indicator.down({error: String(error)});
    }
  }
}
