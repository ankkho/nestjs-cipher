# Contributing

Thank you for contributing to `@nestjs-cipher`! This document outlines our process and standards.

## Development Setup

```bash
# Clone and install
git clone https://github.com/ankkho/nestjs-cipher.git
cd nestjs-cipher
pnpm install

# Run checks
pnpm lint:fix
pnpm build
pnpm test
```

## Commit Standards

We use [Conventional Commits](https://www.conventionalcommits.org/). Scope is optional:

```
feat(kms): add retry backoff
fix: handle edge case in decryption
docs: update README example
refactor: simplify provider initialization
test: add health indicator tests
chore(deps): bump typescript
```

Valid scopes: `kms`, `health`, `module`, `types`, `deps`, `docs`

## Pull Request Process

1. Create a feature branch from `main`: `git switch -c feat/my-feature`
2. Make focused, atomic commits
3. Ensure all checks pass:
   - `pnpm lint` (xo + prettier)
   - `pnpm build` (TypeScript compilation)
   - `pnpm test` (vitest)
4. Push and open a PR
5. Address review feedback with new commits (don't force-push on open PRs)

## Testing

- Add tests for new features in `src/**/*.spec.ts`
- Aim for >80% coverage
- Use descriptive test names: `describe('CipherService', () => { it('encrypts and decrypts symmetrically', ...) })`

## Code Style

- 2 spaces (configured in `.editorconfig` and `package.json`)
- No console.log — use structured pino logger
- No hardcoded values — use config/types
- No relative imports outside the same directory — use absolute paths (Nx style)
- TypeScript strict mode always

## Breaking Changes

If your change breaks the API:

1. Document it in the PR description
2. Update the major version in CHANGELOG.md
3. Note migration path in README.md

## Questions?

Open an issue or start a discussion. We're here to help!
