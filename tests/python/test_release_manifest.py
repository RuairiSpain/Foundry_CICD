from io import BytesIO
from uuid import UUID

import pytest
from foundry_control_plane.release_manifest import DependencyLock, ReleaseManifest
from pydantic import ValidationError


def manifest(**overrides: object) -> ReleaseManifest:
    data: dict[str, object] = {
        "project_id": UUID("ec5c6e7c-799c-43eb-b574-27bc8f55e449"),
        "repository_id": "9007199254740993",
        "commit_sha": "a" * 40,
        "artifact_digest": "b" * 64,
        "configuration_digest": "c" * 64,
        "dependency_locks": (
            DependencyLock(path="package-lock.json", digest="d" * 64),
            DependencyLock(path="requirements.lock", digest="e" * 64),
        ),
    }
    data.update(overrides)
    return ReleaseManifest(**data)  # type: ignore[arg-type]


def test_identical_release_inputs_have_stable_identity_independent_of_lock_order() -> (
    None
):
    original = manifest()
    reordered = manifest(dependency_locks=tuple(reversed(original.dependency_locks)))
    assert original.inputs_digest() == reordered.inputs_digest()
    assert (
        original.inputs_digest()
        == "1ed9bd73a23eb2c859e12fa128c0976a351ebb2e54390fb103e37a0b5abad734"
    )


@pytest.mark.parametrize(
    "change",
    [
        {"project_id": UUID("5ca95858-495c-4a48-b14f-922e53ba0276")},
        {"repository_id": "9007199254740994"},
        {"commit_sha": "f" * 40},
        {"artifact_digest": "f" * 64},
        {"configuration_digest": "f" * 64},
        {
            "dependency_locks": (
                DependencyLock(path="package-lock.json", digest="f" * 64),
            )
        },
    ],
)
def test_material_change_produces_a_different_release_identity(
    change: dict[str, object],
) -> None:
    assert manifest(**change).inputs_digest() != manifest().inputs_digest()


def test_release_inputs_and_nested_locks_are_immutable() -> None:
    release = manifest()
    with pytest.raises(ValidationError):
        release.artifact_digest = "f" * 64
    with pytest.raises(ValidationError):
        release.dependency_locks[0].digest = "f" * 64


def test_artifact_verification_reads_bytes_and_rejects_modified_content() -> None:
    release = manifest(
        artifact_digest="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
    assert release.matches_artifact(BytesIO(b"abc"))
    assert not release.matches_artifact(BytesIO(b"abd"))
    prefixed = BytesIO(b"prefixabc")
    prefixed.seek(6)
    assert not release.matches_artifact(prefixed)


@pytest.mark.parametrize(
    "change",
    [
        {"repository_id": "01"},
        {"commit_sha": "A" * 40},
        {"artifact_digest": "b" * 63},
        {"configuration_digest": "not-a-digest"},
        {"dependency_locks": ()},
        {
            "dependency_locks": (
                DependencyLock(path="package-lock.json", digest="d" * 64),
                DependencyLock(path="package-lock.json", digest="e" * 64),
            )
        },
        {"unexpected": True},
    ],
)
def test_release_manifest_rejects_ambiguous_or_malformed_inputs(
    change: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        manifest(**change)


@pytest.mark.parametrize(
    "path", ["", "../package-lock.json", "x/../lock", "/lock", "x\\lock", "x/./lock"]
)
def test_dependency_lock_rejects_non_repository_paths(path: str) -> None:
    with pytest.raises(ValidationError):
        DependencyLock(path=path, digest="a" * 64)
