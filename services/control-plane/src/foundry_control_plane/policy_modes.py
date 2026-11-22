from enum import StrEnum

from pydantic import BaseModel, ConfigDict, model_validator


class Environment(StrEnum):
    DEV = "dev"
    TEST = "test"
    PRODUCTION = "production"


class Mode(StrEnum):
    OFF = "off"
    ADVISORY = "advisory"
    LEARNING = "learning"
    ENFORCED = "enforced"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Decision(StrEnum):
    SKIPPED = "skipped"
    ADVISORY = "advisory"
    WOULD_BLOCK = "would_block"
    BLOCK = "block"


class Rule(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    severity: Severity
    optional: bool
    baseline: bool

    @model_validator(mode="after")
    def validate_baseline(self) -> "Rule":
        if self.baseline and self.optional:
            raise ValueError("A baseline rule cannot be optional.")
        return self


def classify_triggered_rule(
    rule: Rule, mode: Mode, environment: Environment, threshold: Severity
) -> Decision:
    if not isinstance(rule, Rule) or not all(
        (
            isinstance(mode, Mode),
            isinstance(environment, Environment),
            isinstance(threshold, Severity),
        )
    ):
        raise ValueError("Invalid policy evaluation input.")
    ranks = {
        Severity.LOW: 0,
        Severity.MEDIUM: 1,
        Severity.HIGH: 2,
        Severity.CRITICAL: 3,
    }
    mandatory = rule.baseline or (
        environment == Environment.PRODUCTION
        and ranks[rule.severity] >= ranks[Severity.HIGH]
    )
    if mandatory and mode != Mode.ENFORCED:
        raise ValueError("A mandatory rule must be enforced.")
    if mode == Mode.OFF:
        if not rule.optional:
            raise ValueError("Only optional rules can be switched off.")
        return Decision.SKIPPED
    would_block = mandatory or ranks[rule.severity] >= ranks[threshold]
    if mode == Mode.ENFORCED and would_block:
        return Decision.BLOCK
    if mode == Mode.LEARNING and would_block:
        return Decision.WOULD_BLOCK
    return Decision.ADVISORY
