import argparse
import json
import sys
from pathlib import Path

from foundry_control_plane.app import app


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export or check the control-plane OpenAPI contract."
    )
    parser.add_argument(
        "--output", type=Path, default=Path("packages/contracts/openapi.json")
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated = (
        json.dumps(app.openapi(), indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    )
    if args.check:
        if (
            not args.output.is_file()
            or args.output.read_text(encoding="utf-8") != generated
        ):
            print("OpenAPI contract is missing or out of date.", file=sys.stderr)
            return 1
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(generated, encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
