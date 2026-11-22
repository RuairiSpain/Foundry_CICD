import hashlib
import hmac
import json
import re
from typing import BinaryIO
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DependencyLock(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    path: str = Field(min_length=1, max_length=512)
    digest: str = Field(pattern=r"^[0-9a-f]{64}$")

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        if not re.fullmatch(
            r"(?!.*(?:^|/)\.{1,2}(?:/|$))[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*",
            value,
        ):
            raise ValueError("Lock path must be repository-relative.")
        return value


class ReleaseManifest(BaseModel):
    """Unverified release inputs; this object does not authorize or seal a release."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    project_id: UUID
    repository_id: str = Field(pattern=r"^[1-9][0-9]{0,19}$")
    commit_sha: str = Field(pattern=r"^[0-9a-f]{40}$")
    artifact_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    configuration_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    dependency_locks: tuple[DependencyLock, ...] = Field(min_length=1)

    @field_validator("dependency_locks")
    @classmethod
    def validate_locks(
        cls, locks: tuple[DependencyLock, ...]
    ) -> tuple[DependencyLock, ...]:
        if len({lock.path for lock in locks}) != len(locks):
            raise ValueError("Dependency lock paths must be unique.")
        return tuple(sorted(locks, key=lambda lock: lock.path))

    def inputs_digest(self) -> str:
        payload = {
            "version": "foundry-release-inputs-v1",
            "project_id": str(self.project_id),
            "repository_id": self.repository_id,
            "commit_sha": self.commit_sha,
            "artifact_digest": self.artifact_digest,
            "configuration_digest": self.configuration_digest,
            "dependency_locks": [
                {"path": lock.path, "digest": lock.digest}
                for lock in self.dependency_locks
            ],
        }
        canonical = json.dumps(
            payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def matches_artifact(self, artifact: BinaryIO) -> bool:
        artifact.seek(0)
        digest = hashlib.sha256()
        for chunk in iter(lambda: artifact.read(1024 * 1024), b""):
            digest.update(chunk)
        return hmac.compare_digest(digest.hexdigest(), self.artifact_digest)
