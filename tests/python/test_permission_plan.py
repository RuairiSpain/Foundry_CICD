import pytest
from foundry_control_plane.permission_plan import (
    Access,
    Permission,
    Scope,
    compare_permissions,
)
from pydantic import ValidationError


def permission(scope: Scope, name: str, access: Access) -> Permission:
    return Permission(scope=scope, name=name, access=access)


def test_permission_plan_reports_exact_expansion_and_reduction() -> None:
    current = (
        permission(Scope.REPOSITORY, "checks", Access.READ),
        permission(Scope.REPOSITORY, "contents", Access.WRITE),
        permission(Scope.ORGANIZATION, "projects", Access.READ),
    )
    proposed = (
        permission(Scope.REPOSITORY, "checks", Access.WRITE),
        permission(Scope.REPOSITORY, "contents", Access.READ),
        permission(Scope.REPOSITORY, "issues", Access.WRITE),
    )
    plan = compare_permissions(current, proposed)
    assert [
        (item.scope, item.name, item.previous, item.requested, item.direction)
        for item in plan
    ] == [
        (Scope.ORGANIZATION, "projects", Access.READ, None, "reduction"),
        (Scope.REPOSITORY, "checks", Access.READ, Access.WRITE, "expansion"),
        (Scope.REPOSITORY, "contents", Access.WRITE, Access.READ, "reduction"),
        (Scope.REPOSITORY, "issues", None, Access.WRITE, "expansion"),
    ]


def test_unchanged_permissions_produce_no_changes_and_scopes_do_not_merge() -> None:
    current = (permission(Scope.ORGANIZATION, "projects", Access.READ),)
    assert compare_permissions(current, current) == ()
    proposed = (permission(Scope.REPOSITORY, "projects", Access.READ),)
    plan = compare_permissions(current, proposed)
    assert len(plan) == 2
    assert {item.direction for item in plan} == {"expansion", "reduction"}


def test_admin_is_a_distinct_higher_privilege_than_write() -> None:
    current = (permission(Scope.ORGANIZATION, "organization_projects", Access.WRITE),)
    desired = (permission(Scope.ORGANIZATION, "organization_projects", Access.ADMIN),)
    assert compare_permissions(current, desired)[0].direction == "expansion"
    assert compare_permissions(desired, current)[0].direction == "reduction"


def test_duplicate_or_unvalidated_permission_snapshots_are_rejected() -> None:
    check = permission(Scope.REPOSITORY, "checks", Access.READ)
    with pytest.raises(ValueError):
        compare_permissions((check, check), ())
    with pytest.raises(ValueError):
        compare_permissions((), (check, check))
    with pytest.raises(ValueError):
        compare_permissions(None, ())  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        permission(Scope.REPOSITORY, "checks/../../secret", Access.READ)
    with pytest.raises(ValidationError):
        Permission(scope="repository", name="checks", access="write")
