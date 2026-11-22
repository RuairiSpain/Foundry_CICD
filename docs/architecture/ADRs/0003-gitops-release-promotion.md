# ADR-0003: GitOps and immutable promotion

Status: Accepted

Repository configuration is desired state. Build once and seal a release with source SHA and artifact digest. Dev, Test and Production deployments reference the same release. Environment values are bindings, not rebuilt application code. Deployment success requires post-deployment smoke/evaluation evidence. Manual resource changes are drift and lead to a remediation PR by default.
