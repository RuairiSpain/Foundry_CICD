# ADR-0002: Azure hosting, Bicep and deployment

Status: Accepted

Host the application on Azure Container Apps. Reference architecture uses Service Bus, Azure Database for PostgreSQL Flexible Server, Key Vault, Container Registry and Azure Monitor. Provision with modular Bicep. Use managed identities for runtime access and GitHub OIDC for Actions. Scope RBAC to environment resource groups where practical.

Support both multi-tenant central hosting and customer-hosted deployments. Customer data-plane resources and deployment identities are customer owned. Hosted-agent deployment through supported Foundry/`azd` commands is wrapped by a provider and may be preview; production use requires visible risk acceptance and compatibility evidence.
