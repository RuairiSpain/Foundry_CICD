CREATE TABLE webhook_inbox (
    delivery_id UUID PRIMARY KEY,
    installation_id TEXT NOT NULL CHECK (installation_id ~ '^[1-9][0-9]*$'),
    repository_id TEXT NOT NULL CHECK (repository_id ~ '^[1-9][0-9]*$'),
    ref TEXT NOT NULL,
    commit_sha TEXT NOT NULL CHECK (commit_sha ~ '^[0-9a-f]{40}$'),
    body_digest TEXT NOT NULL CHECK (body_digest ~ '^[0-9a-f]{64}$'),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_outbox (
    delivery_id UUID PRIMARY KEY REFERENCES webhook_inbox (delivery_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    lease_token UUID,
    leased_until TIMESTAMPTZ,
    CHECK ((lease_token IS NULL) = (leased_until IS NULL))
);
