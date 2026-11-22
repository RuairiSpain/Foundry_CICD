---
applyTo: "infra/**/*.bicep,infra/**/*.bicepparam"
---
Use Bicep modules, secure parameters only for references, managed identity, diagnostic settings and least-privilege role assignments. No secret outputs. Separate bootstrap role-assignment privilege from deployment identity. Run build/lint and what-if for applicable environments. Preserve central- and customer-hosted parameterization.
