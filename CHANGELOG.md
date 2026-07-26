# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-07-26)


### Features

* add auto key creation for KMS keys ([#51](https://github.com/ankkho/nestjs-cipher/issues/51)) ([0b639e4](https://github.com/ankkho/nestjs-cipher/commit/0b639e437d577fce7d9ce976ff78a26c219f348f))
* added in-memory DEK caching ([#16](https://github.com/ankkho/nestjs-cipher/issues/16)) ([0c24699](https://github.com/ankkho/nestjs-cipher/commit/0c24699b19df78a09767b0d828a19ace4b546865))
* added tofu files for gcp-kms, updated readme ([#14](https://github.com/ankkho/nestjs-cipher/issues/14)) ([9fd0155](https://github.com/ankkho/nestjs-cipher/commit/9fd0155036d3f97be668fbb517813252592f3778))
* **kms:** add publish workflow with npm provenance, separate from release-please ([#12](https://github.com/ankkho/nestjs-cipher/issues/12)) ([993694e](https://github.com/ankkho/nestjs-cipher/commit/993694e067560de20821602ad10773bac3e9a0f8))
* local provider ([#8](https://github.com/ankkho/nestjs-cipher/issues/8)) ([2b8df4e](https://github.com/ankkho/nestjs-cipher/commit/2b8df4e02a521d6b1f234b9fd7c5980b92c95c86))
* nestjs module ([#7](https://github.com/ankkho/nestjs-cipher/issues/7)) ([96720bb](https://github.com/ankkho/nestjs-cipher/commit/96720bb883dcabdb7667886dfc8ba0b8ef2d3e9a))
* otel ([#11](https://github.com/ankkho/nestjs-cipher/issues/11)) ([789b02a](https://github.com/ankkho/nestjs-cipher/commit/789b02a8b95035f0dd28dc6cd1ab50f6882fbf35))
* replace release-drafter with release-please ([#15](https://github.com/ankkho/nestjs-cipher/issues/15)) ([59a4f86](https://github.com/ankkho/nestjs-cipher/commit/59a4f86f5daa5f239db11068088768b5411faa49))
* update installation docs to use scoped package name @ankkho/nestjs-cipher ([#22](https://github.com/ankkho/nestjs-cipher/issues/22)) ([22afac4](https://github.com/ankkho/nestjs-cipher/commit/22afac486ce45486e740a263a36a8cc6ae8b78ea))


### Bug Fixes

* updated readme, added git url ([#36](https://github.com/ankkho/nestjs-cipher/issues/36)) ([5859aca](https://github.com/ankkho/nestjs-cipher/commit/5859aca4af863536b0fb9f0560ab43eb96c4f618))

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
