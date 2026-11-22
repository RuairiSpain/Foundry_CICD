# ADR-0004: branch strategy lifecycle

Status: Accepted

New projects choose trunk-based development with short-lived feature branches or Gitflow. Both use PR checks and the same release/promotion model. Product supports a guided `trunk -> gitflow` migration only. Reverse migration is not exposed in UI/API. Migration is planned, audited and stateful; Gitflow cannot be selected until branch/ruleset/workflow verification succeeds.
