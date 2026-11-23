from enum import StrEnum
from typing import Final
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OperationState(StrEnum):
    ACCEPTED = "accepted"
    VALIDATING = "validating"
    AUTHORIZED = "authorized"
    PLANNED = "planned"
    EXECUTING = "executing"
    VERIFYING = "verifying"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    BLOCKED = "blocked"
    EXPIRED = "expired"


class TransitionError(ValueError):
    pass


_TRANSITIONS: Final[dict[OperationState, frozenset[OperationState]]] = {
    OperationState.ACCEPTED: frozenset(
        {OperationState.VALIDATING, OperationState.BLOCKED, OperationState.EXPIRED}
    ),
    OperationState.VALIDATING: frozenset(
        {
            OperationState.AUTHORIZED,
            OperationState.FAILED,
            OperationState.BLOCKED,
            OperationState.EXPIRED,
        }
    ),
    OperationState.AUTHORIZED: frozenset(
        {
            OperationState.PLANNED,
            OperationState.FAILED,
            OperationState.BLOCKED,
            OperationState.EXPIRED,
        }
    ),
    OperationState.PLANNED: frozenset(
        {
            OperationState.EXECUTING,
            OperationState.FAILED,
            OperationState.BLOCKED,
            OperationState.EXPIRED,
        }
    ),
    OperationState.EXECUTING: frozenset(
        {OperationState.VERIFYING, OperationState.FAILED, OperationState.BLOCKED}
    ),
    OperationState.VERIFYING: frozenset(
        {OperationState.SUCCEEDED, OperationState.FAILED, OperationState.BLOCKED}
    ),
}


class Operation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    id: UUID
    tenant_id: str = Field(
        min_length=1, max_length=128, pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    )
    state: OperationState = OperationState.ACCEPTED
    version: int = Field(default=0, ge=0)

    def transition(
        self, tenant_id: str, expected_version: int, state: OperationState
    ) -> "Operation":
        if tenant_id != self.tenant_id:
            raise TransitionError("Operation tenant mismatch.")
        if type(expected_version) is not int or expected_version != self.version:
            raise TransitionError("Operation version conflict.")
        if not isinstance(state, OperationState) or state not in _TRANSITIONS.get(
            self.state, frozenset()
        ):
            raise TransitionError("Invalid operation transition.")
        return self.model_copy(update={"state": state, "version": self.version + 1})
