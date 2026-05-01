# Release Process

Releases are fully automated via [release-please](https://github.com/googleapis/release-please).

## How It Works

1. **Merge commits to `main`** — release-please analyzes commit messages
2. **Release PR is opened** — version bump + `CHANGELOG.md` updated automatically
3. **Merge the Release PR** — creates a GitHub release, git tag, and triggers npm publish

## Semver Bumps

| Commit prefix | Version bump | Example |
|---|---|---|
| `fix:` | patch | `1.0.0` → `1.0.1` |
| `feat:` | minor | `1.0.0` → `1.1.0` |
| `feat!:` / `BREAKING CHANGE:` | major | `1.0.0` → `2.0.0` |

Hidden from changelog: `chore:`, `test:`, `ci:`

## Required Secrets

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | Publish to npm registry |

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

Valid scopes: `kms`, `health`, `module`, `types`, `deps`, `docs`
