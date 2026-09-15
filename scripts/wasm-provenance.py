#!/usr/bin/env python3
"""Record the source inputs, toolchain, and exact generated browser assets."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sources(directory: Path) -> dict:
    paths = [directory / "Cargo.toml", directory / "Cargo.lock"]
    paths.extend(directory.joinpath("src").rglob("*.rs"))
    files = {str(path.relative_to(directory)): digest(path) for path in sorted(paths)}
    aggregate = hashlib.sha256()
    for name, sha256 in files.items():
        aggregate.update(f"{name}\0{sha256}\n".encode())
    return {"source_sha256": aggregate.hexdigest(), "files": files}


def main() -> None:
    project = Path(__file__).resolve().parent.parent
    output = Path(sys.argv[1])
    core_directory = project / "vendor/sudoku-core"
    core_origin = json.loads((core_directory / "PROVENANCE.json").read_text())
    # A stale imported provenance record must not silently describe a new binary.
    for name, sha256 in core_origin["files"].items():
        if digest(core_directory / name) != sha256:
            raise SystemExit(f"Core provenance is stale for {name}; refresh the vendored snapshot.")
    artifacts = ["sudoku_wasm.js", "sudoku_wasm_bg.wasm", "sudoku_wasm.d.ts", "sudoku_wasm_bg.wasm.d.ts", "package.json"]
    record = {
        "schema_version": 1,
        "target": "wasm32-unknown-unknown",
        "core": {
            "repository": core_origin["repository"],
            "base_revision": core_origin["base_revision"],
            "vendored_source_sha256": core_origin["source_sha256"],
            **sources(core_directory),
        },
        "browser": {
            "repository": "https://github.com/kcirtapfromspace/sudoku",
            "base_revision": "c371f588aec8a80bb5402d853b6d7414cdb9013c",
            **sources(project / "vendor/sudoku-wasm"),
        },
        "toolchain": {
            tool: subprocess.check_output([tool, "--version"], text=True).strip()
            for tool in ("rustc", "wasm-pack")
        },
        "build_scripts": {
            name: digest(project / "scripts" / name)
            for name in ("build-wasm.sh", "wasm-provenance.py")
        },
        "artifacts": {name: digest(output / name) for name in artifacts},
    }
    (output / "provenance.json").write_text(json.dumps(record, indent=2) + "\n")


if __name__ == "__main__":
    main()
