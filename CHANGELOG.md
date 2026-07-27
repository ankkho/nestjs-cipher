# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4](https://github.com/ankkho/nestjs-cipher/compare/v1.1.3...v1.1.4) (2026-07-27)


### Bug Fixes

* **deps:** add workflow_dispatch to publish workflow ([1675589](https://github.com/ankkho/nestjs-cipher/commit/16755899471b13c8443cd29387a885e6beab4261))
* **deps:** clean .npmrc for OIDC trusted publishers ([d96df1e](https://github.com/ankkho/nestjs-cipher/commit/d96df1e83ef452a2bcb7c365adb290a208dec8a6))
* **deps:** remove registry-url to enable npm OIDC trusted publishers ([b3280f9](https://github.com/ankkho/nestjs-cipher/commit/b3280f9e0caa8c0206749cf09db673e8f030ec2b))
* **deps:** use npm publish for OIDC provenance ([e409b60](https://github.com/ankkho/nestjs-cipher/commit/e409b60b934ac3c10fb8494fc8cb6d24a86da9ae))
* **deps:** wire NPM_TOKEN into publish workflow ([2912350](https://github.com/ankkho/nestjs-cipher/commit/2912350a076ad21d074fbbc3abcaeb8297b18fb3))

## [1.1.3](https://github.com/ankkho/nestjs-cipher/compare/v1.1.2...v1.1.3) (2026-07-27)


### Bug Fixes

* **deps:** use RELEASE_PLEASE_TOKEN for release creation ([c3b96c9](https://github.com/ankkho/nestjs-cipher/commit/c3b96c90b3e14c8b0116b84deec1aa52cc328d81))
* updated publish.yml for trusted publisher ([#15](https://github.com/ankkho/nestjs-cipher/issues/15)) ([408c18c](https://github.com/ankkho/nestjs-cipher/commit/408c18cb38661d1378281b7634d0ea262f48b374))

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
