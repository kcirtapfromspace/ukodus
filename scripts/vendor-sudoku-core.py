#!/usr/bin/env python3
"""Snapshot the local solver source so native and WASM builds use identical code.

Run after reviewing/testing changes in the upstream checkout. Records the base
revision plus the hash of every included file; no dependency on that checkout is
needed to build the resulting Ukodus tree.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tomllib


def copy_snapshot(source: Path, destination: Path, revision: str):
    if tomllib.loads((source / "Cargo.toml").read_text())["package"]["name"] != "sudoku-core":
        raise ValueError("Source manifest is not sudoku-core")
    files = [source / name for name in ("Cargo.toml", "Cargo.lock", "LICENSE", "README.md")]
    for directory in ("src", "tests", "examples", "docs", "scripts"):
        files.extend(path for path in (source / directory).rglob("*")
                     if path.is_file() and path.suffix in (".rs", ".md", ".py", ".sh"))
    # Read every input before changing the destination. A missing source file
    # must not leave a partially refreshed dependency.
    content = {path.relative_to(source).as_posix(): path.read_bytes() for path in sorted(files)}
    previous_path = destination / "PROVENANCE.json"
    previous = json.loads(previous_path.read_text())["files"] if previous_path.exists() else {}
    stale = set(previous) - set(content)
    for relative in stale:
        target = destination / relative
        if Path(relative).is_absolute() or ".." in Path(relative).parts or not target.resolve().is_relative_to(destination.resolve()):
            raise ValueError("Invalid path in previous snapshot provenance")
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != previous[relative]:
            raise ValueError(f"Refusing to remove locally modified stale source: {relative}")
    manifest = {}
    for path in sorted(files):
        relative = path.relative_to(source).as_posix()
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content[relative])
        shutil.copymode(path, target)
        manifest[relative] = hashlib.sha256(content[relative]).hexdigest()
    for relative in stale:
        (destination / relative).unlink(missing_ok=True)
    aggregate = hashlib.sha256()
    for relative, digest in sorted(manifest.items()):
        aggregate.update(f"{relative}\0{digest}\n".encode())
    provenance = {
        "repository": "https://github.com/kcirtapfromspace/sudoku-core",
        "base_revision": revision,
        "description": "Source snapshot including local verified residue and replay changes",
        "source_sha256": aggregate.hexdigest(),
        "files": manifest,
    }
    (destination / "PROVENANCE.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(f"Copied {len(manifest)} solver files; source SHA-256 {aggregate.hexdigest()}")


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=root.parent / "sudoku-core")
    args = parser.parse_args()
    source = args.source.resolve()
    destination = root / "vendor" / "sudoku-core"
    if source == destination.resolve():
        parser.error("Source must be the upstream checkout, not the vendored copy")
    revision = subprocess.check_output(
        ["git", "-C", str(source), "rev-parse", "HEAD"], text=True
    ).strip()
    copy_snapshot(source, destination, revision)


if __name__ == "__main__":
    main()
