CREATE TABLE dev_push_operations (
    delivery_id UUID PRIMARY KEY,
    operation_id UUID NOT NULL UNIQUE,
    installation_id TEXT NOT NULL CHECK (installation_id ~ '^[1-9][0-9]{0,19}$'),
    repository_id TEXT NOT NULL CHECK (repository_id ~ '^[1-9][0-9]{0,19}$'),
    ref TEXT NOT NULL,
    commit_sha TEXT NOT NULL CHECK (commit_sha ~ '^[0-9a-f]{40}$'),
    body_digest TEXT NOT NULL CHECK (body_digest ~ '^[0-9a-f]{64}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dev_mock_checks (
    operation_id UUID PRIMARY KEY REFERENCES dev_push_operations (operation_id),
    repository_id TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status = 'queued'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
