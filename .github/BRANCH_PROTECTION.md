# Ikunik Required Branch Protection

Apply these rules after the first successful GitHub Actions run.

Protected branches:
- `aifayaa/ikunik-app`: `staging/target-infra-build-ready`
- `aifayaa/ikunik-build-tools`: `master`
- `aifayaa/ikunik-dashboard`: `main`
- `aifayaa/ikunik-infra`: `main`

Required checks:
- `ikunik-app-guard`
- `ikunik-build-tools-guard`
- `ikunik-dashboard-guard`
- `ikunik-infra-guard`

Minimum required settings:
- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Do not allow force pushes.
- Do not allow deletions.
- Restrict direct pushes to release maintainers only.

Operational rule:
- iOS/TestFlight builds must continue to run from the isolated macOS build lane until a dedicated self-hosted GitHub Actions macOS runner is configured with Xcode 26+, Ikunik signing S3 access, and no legacy AWS credentials.
