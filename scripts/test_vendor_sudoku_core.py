import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("vendor_sudoku_core", Path(__file__).with_name("vendor-sudoku-core.py"))
vendor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vendor)


class SnapshotTests(unittest.TestCase):
    def test_refresh_removes_deleted_sources_but_preserves_build_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / "source", root / "vendor"
            (source / "src").mkdir(parents=True)
            for name, content in {
                "Cargo.toml": '[package]\nname = "sudoku-core"\n', "Cargo.lock": "# lock\n",
                "LICENSE": "license\n", "README.md": "readme\n", "src/lib.rs": "pub fn current() {}\n",
                "src/obsolete.rs": "pub fn obsolete() {}\n",
            }.items():
                (source / name).write_text(content)
            with contextlib.redirect_stdout(io.StringIO()):
                vendor.copy_snapshot(source, target, "revision-one")
            (target / "target").mkdir()
            (target / "target/cache").write_text("cache")
            (source / "src/obsolete.rs").unlink()
            (source / "src/lib.rs").write_text("pub fn replaced() {}\n")
            with contextlib.redirect_stdout(io.StringIO()):
                vendor.copy_snapshot(source, target, "revision-two")
            self.assertFalse((target / "src/obsolete.rs").exists())
            self.assertEqual((target / "target/cache").read_text(), "cache")
            provenance = json.loads((target / "PROVENANCE.json").read_text())
            self.assertNotIn("src/obsolete.rs", provenance["files"])
            for relative, digest in provenance["files"].items():
                self.assertEqual(hashlib.sha256((target / relative).read_bytes()).hexdigest(), digest)
            (source / "src/lib.rs").unlink()
            (target / "src/lib.rs").write_text("local work")
            with self.assertRaisesRegex(ValueError, "locally modified"):
                vendor.copy_snapshot(source, target, "revision-three")
            self.assertEqual((target / "src/lib.rs").read_text(), "local work")


if __name__ == "__main__":
    unittest.main()
