# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
