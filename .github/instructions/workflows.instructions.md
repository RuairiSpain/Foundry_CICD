---
applyTo: ".github/workflows/**/*.yml,.github/workflows/**/*.yaml,templates/github/workflows/**/*.yml,templates/github/workflows/**/*.yaml"
---
Set minimal top-level/job permissions; grant `id-token: write` only to Azure-login jobs. Pin third-party actions to reviewed full SHAs in production templates. Use concurrency for deployments, GitHub Environments for promotion, immutable artifact digests and OIDC rather than client secrets. Never interpolate untrusted event content into shell. Validate YAML and action policy.
