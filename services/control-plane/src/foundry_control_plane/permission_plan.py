from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Scope(StrEnum):
    REPOSITORY = "repository"
    ORGANIZATION = "organization"


class Access(StrEnum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class Permission(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    scope: Scope
    name: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    access: Access


class PermissionChange(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    scope: Scope
    name: str
    previous: Access | None
    requested: Access | None
    direction: Literal["expansion", "reduction"]


def _index(
    permissions: tuple[Permission, ...],
) -> dict[tuple[Scope, str], Access]:
    if not isinstance(permissions, tuple) or not all(
        isinstance(item, Permission) for item in permissions
    ):
        raise ValueError("A complete permission snapshot is required.")
    result: dict[tuple[Scope, str], Access] = {}
    for item in permissions:
        key = (item.scope, item.name)
        if key in result:
            raise ValueError("Duplicate permissions are not allowed.")
        result[key] = item.access
    return result


def compare_permissions(
    current: tuple[Permission, ...], proposed: tuple[Permission, ...]
) -> tuple[PermissionChange, ...]:
    previous = _index(current)
    requested = _index(proposed)
    levels: dict[Access | None, int] = {
        None: 0,
        Access.READ: 1,
        Access.WRITE: 2,
        Access.ADMIN: 3,
    }
    changes: list[PermissionChange] = []
    for scope, name in sorted(
        previous.keys() | requested.keys(), key=lambda key: (key[0].value, key[1])
    ):
        old, new = previous.get((scope, name)), requested.get((scope, name))
        if old != new:
            changes.append(
                PermissionChange(
                    scope=scope,
                    name=name,
                    previous=old,
                    requested=new,
                    direction="expansion" if levels[new] > levels[old] else "reduction",
                )
            )
    return tuple(changes)
