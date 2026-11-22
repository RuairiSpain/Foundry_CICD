from uuid import UUID

import pytest
from foundry_control_plane.push_event import PushEvent
from pydantic import ValidationError


def event_data():
    return {
        "deliveryId": "27c30c56-d6b0-4b9e-b9bc-191502697d50",
        "installationId": "123",
        "repositoryId": "456",
        "ref": "refs/heads/main",
        "commitSha": "a" * 40,
        "bodyDigest": "b" * 64,
    }


def test_normalized_push_event_accepts_gateway_payload_and_preserves_provider_ids():
    event = PushEvent.model_validate(event_data())
    assert event.delivery_id == UUID("27c30c56-d6b0-4b9e-b9bc-191502697d50")
    assert event.installation_id == "123"
    assert event.repository_id == "456"
    assert event.model_dump(by_alias=True, mode="json") == event_data()


@pytest.mark.parametrize(
    "change",
    [
        {"installationId": "0"},
        {"repositoryId": "01"},
        {"ref": "refs/heads/bad branch"},
        {"commitSha": "G" * 40},
        {"bodyDigest": "b" * 63},
        {"deliveryId": "not-a-uuid"},
        {"deliveryId": "27c30c56d6b04b9eb9bc191502697d50"},
        {"deliveryId": "27C30C56-D6B0-4B9E-B9BC-191502697D50"},
        {"unexpected": True},
    ],
)
def test_normalized_push_event_rejects_malformed_and_unexpected_fields(change):
    with pytest.raises(ValidationError):
        PushEvent.model_validate({**event_data(), **change})
