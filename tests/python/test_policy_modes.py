import pytest
from foundry_control_plane.policy_modes import (
    Decision,
    Environment,
    Mode,
    Rule,
    Severity,
    classify_triggered_rule,
)
from pydantic import ValidationError


@pytest.mark.parametrize(
    ("mode", "severity", "threshold", "expected"),
    [
        (Mode.ADVISORY, Severity.HIGH, Severity.MEDIUM, Decision.ADVISORY),
        (Mode.LEARNING, Severity.HIGH, Severity.MEDIUM, Decision.WOULD_BLOCK),
        (Mode.LEARNING, Severity.LOW, Severity.MEDIUM, Decision.ADVISORY),
        (Mode.ENFORCED, Severity.HIGH, Severity.MEDIUM, Decision.BLOCK),
        (Mode.ENFORCED, Severity.LOW, Severity.MEDIUM, Decision.ADVISORY),
        (Mode.OFF, Severity.HIGH, Severity.MEDIUM, Decision.SKIPPED),
    ],
)
def test_triggered_rule_modes_do_not_block_without_enforcement(
    mode: Mode, severity: Severity, threshold: Severity, expected: Decision
) -> None:
    rule = Rule(severity=severity, optional=True, baseline=False)
    assert classify_triggered_rule(rule, mode, Environment.DEV, threshold) == expected


@pytest.mark.parametrize("mode", [Mode.OFF, Mode.ADVISORY, Mode.LEARNING])
def test_baseline_cannot_be_disabled_or_downgraded(mode: Mode) -> None:
    rule = Rule(severity=Severity.LOW, optional=False, baseline=True)
    with pytest.raises(ValueError):
        classify_triggered_rule(rule, mode, Environment.DEV, Severity.CRITICAL)
    assert (
        classify_triggered_rule(rule, Mode.ENFORCED, Environment.DEV, Severity.CRITICAL)
        == Decision.BLOCK
    )


@pytest.mark.parametrize("severity", [Severity.HIGH, Severity.CRITICAL])
@pytest.mark.parametrize("mode", [Mode.OFF, Mode.ADVISORY, Mode.LEARNING])
def test_production_high_and_critical_cannot_be_downgraded(
    severity: Severity, mode: Mode
) -> None:
    rule = Rule(severity=severity, optional=True, baseline=False)
    with pytest.raises(ValueError):
        classify_triggered_rule(rule, mode, Environment.PRODUCTION, Severity.CRITICAL)
    assert (
        classify_triggered_rule(
            rule, Mode.ENFORCED, Environment.PRODUCTION, Severity.CRITICAL
        )
        == Decision.BLOCK
    )


def test_only_explicitly_optional_rules_can_be_switched_off() -> None:
    rule = Rule(severity=Severity.LOW, optional=False, baseline=False)
    with pytest.raises(ValueError):
        classify_triggered_rule(rule, Mode.OFF, Environment.TEST, Severity.MEDIUM)


def test_policy_inputs_cannot_bypass_validation() -> None:
    with pytest.raises(ValidationError):
        Rule(severity=Severity.HIGH, optional=True, baseline=True)
    with pytest.raises(ValidationError):
        Rule(severity=Severity.HIGH, optional=False, baseline=False, unknown=True)
    rule = Rule(severity=Severity.LOW, optional=False, baseline=False)
    with pytest.raises(ValueError):
        classify_triggered_rule(rule, "enforced", Environment.DEV, Severity.LOW)  # type: ignore[arg-type]
