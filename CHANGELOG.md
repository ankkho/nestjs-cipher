# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/ankkho/nestjs-cipher/compare/v1.0.0...v1.1.0) (2026-05-01)


### Features

* update installation docs to use scoped package name @ankkho/nestjs-cipher ([#22](https://github.com/ankkho/nestjs-cipher/issues/22)) ([e24fdf4](https://github.com/ankkho/nestjs-cipher/commit/e24fdf42f96ff05f5feb5c3c972a8bbd59bdd1be))

## 1.0.0 (2026-05-01)


### Features

* added in-memory DEK caching ([#16](https://github.com/ankkho/nestjs-cipher/issues/16)) ([742f651](https://github.com/ankkho/nestjs-cipher/commit/742f651936bf6631bb34ef9707beb7b90d52f421))
* added tofu files for gcp-kms, updated readme ([#14](https://github.com/ankkho/nestjs-cipher/issues/14)) ([db37849](https://github.com/ankkho/nestjs-cipher/commit/db37849c78bbe0e0021145a783aa8dec7e30d0f0))
* local provider ([#8](https://github.com/ankkho/nestjs-cipher/issues/8)) ([c64ae3f](https://github.com/ankkho/nestjs-cipher/commit/c64ae3f928f7ac96ed0d7086702bc95039cf414b))
* nestjs module ([#7](https://github.com/ankkho/nestjs-cipher/issues/7)) ([96720bb](https://github.com/ankkho/nestjs-cipher/commit/96720bb883dcabdb7667886dfc8ba0b8ef2d3e9a))
* otel ([#11](https://github.com/ankkho/nestjs-cipher/issues/11)) ([ec23fb4](https://github.com/ankkho/nestjs-cipher/commit/ec23fb48e5c8a50c0832d49d650d85a82870e5b4))
* replace release-drafter with release-please ([#15](https://github.com/ankkho/nestjs-cipher/issues/15)) ([f1f91bc](https://github.com/ankkho/nestjs-cipher/commit/f1f91bc42ef3fd8b178d965c128ee18d004a3fc2))

## [Unreleased]

## [1.0.0] - 2026-04-30

### Added

- Initial release
- AES-256-GCM envelope encryption with KMS key wrapping
- GCP KMS provider implementation
- Async module registration (forRoot, forRootAsync)
- Health indicator for KMS connectivity
- Exponential-backoff retry logic on transient KMS errors
- Payload version routing for forward-compatible decryption
- Strongly-typed interfaces and injection tokens
- Full TypeScript support with strict mode
- Comprehensive documentation and example
