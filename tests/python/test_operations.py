from uuid import uuid4

import pytest
from foundry_control_plane.operations import Operation, OperationState, TransitionError
from pydantic import ValidationError


def new_operation() -> Operation:
    return Operation(id=uuid4(), tenant_id="installation-123")


def test_operation_moves_through_authorized_execution() -> None:
    operation = new_operation()
    for version, state in enumerate(
        [
            OperationState.VALIDATING,
            OperationState.AUTHORIZED,
            OperationState.PLANNED,
            OperationState.EXECUTING,
            OperationState.VERIFYING,
            OperationState.SUCCEEDED,
        ]
    ):
        previous = operation
        operation = operation.transition("installation-123", version, state)
        assert previous.version == version
        assert operation.version == version + 1
    assert operation.state == OperationState.SUCCEEDED


def test_operation_rejects_cross_tenant_and_stale_updates() -> None:
    operation = new_operation()
    with pytest.raises(TransitionError, match="tenant"):
        operation.transition("installation-999", 0, OperationState.VALIDATING)
    with pytest.raises(TransitionError, match="version"):
        operation.transition("installation-123", 1, OperationState.VALIDATING)
    assert operation.version == 0


def test_operation_rejects_skipped_gates_and_terminal_restarts() -> None:
    operation = new_operation()
    with pytest.raises(TransitionError, match="transition"):
        operation.transition("installation-123", 0, OperationState.EXECUTING)
    blocked = operation.transition("installation-123", 0, OperationState.BLOCKED)
    with pytest.raises(TransitionError, match="transition"):
        blocked.transition("installation-123", 1, OperationState.VALIDATING)


def test_operation_rejects_invalid_or_unexpected_input() -> None:
    with pytest.raises(ValidationError):
        Operation(id=uuid4(), tenant_id="", extra_field="unsafe")
    with pytest.raises(ValidationError):
        Operation(id=uuid4(), tenant_id="installation-123", version=-1)


def test_operation_does_not_accept_unvalidated_transition_inputs() -> None:
    operation = new_operation()
    with pytest.raises(TransitionError):
        operation.transition("installation-123", False, OperationState.VALIDATING)
    with pytest.raises(TransitionError):
        operation.transition("installation-123", 0, "validating")  # type: ignore[arg-type]
