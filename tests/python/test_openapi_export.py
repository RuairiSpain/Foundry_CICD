import os
import subprocess
import sys
from pathlib import Path


def test_openapi_export_detects_stale_contract_without_rewriting_it(
    tmp_path: Path,
) -> None:
    script = Path("scripts/export-openapi.py")
    output = tmp_path / "openapi.json"
    env = {**os.environ, "PYTHONPATH": "services/control-plane/src"}
    write = subprocess.run(
        [sys.executable, str(script), "--output", str(output)],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert write.returncode == 0, write.stderr
    verify = subprocess.run(
        [sys.executable, str(script), "--output", str(output), "--check"],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert verify.returncode == 0, verify.stderr
    output.write_text("stale", encoding="utf-8")
    stale = subprocess.run(
        [sys.executable, str(script), "--output", str(output), "--check"],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert stale.returncode != 0
    assert output.read_text(encoding="utf-8") == "stale"
