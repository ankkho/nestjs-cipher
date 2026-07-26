# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0](https://github.com/ankkho/nestjs-cipher/releases/tag/v1.0.0) - 2026-04-30

### Features

- AES-256-GCM envelope encryption with GCP Cloud KMS key wrapping
- Async module registration (`forRoot`, `forRootAsync`)
- Transparent auto-key-creation on first encrypt — no manual provisioning needed
- Multi-tenant key isolation via `tenant-{id}` and `user-{id}` aliases
- In-memory DEK caching with configurable TTL
- OpenTelemetry tracing integration
- Health indicator for KMS connectivity
- Exponential-backoff retry logic on transient KMS errors
- Payload version routing for forward-compatible decryption
- Self-contained Tofu `kms.tf` for copy-paste infrastructure setup
- Strongly-typed interfaces and injection tokens
- Full TypeScript support with strict mode
