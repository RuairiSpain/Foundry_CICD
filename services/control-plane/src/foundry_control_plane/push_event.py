import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PushEvent(BaseModel):
    """Normalized push metadata emitted by the GitHub gateway."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    delivery_id: UUID = Field(alias="deliveryId", strict=False)
    installation_id: str = Field(alias="installationId", pattern=r"^[1-9][0-9]{0,19}$")
    repository_id: str = Field(alias="repositoryId", pattern=r"^[1-9][0-9]{0,19}$")
    ref: str = Field(pattern=r"^refs/[^\x00-\x20\x7f]{1,250}$")
    commit_sha: str = Field(alias="commitSha", pattern=r"^[0-9a-f]{40}$")
    body_digest: str = Field(alias="bodyDigest", pattern=r"^[0-9a-f]{64}$")

    @field_validator("delivery_id", mode="before")
    @classmethod
    def validate_delivery_id(cls, value: object) -> object:
        if not isinstance(value, UUID) and (
            not isinstance(value, str)
            or not re.fullmatch(r"[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}", value)
        ):
            raise ValueError("Delivery ID must be a canonical lowercase UUID.")
        return value
