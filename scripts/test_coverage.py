"""Regression tests for the coverage gate itself; no Rust compiler required."""

import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("ukodus_coverage", Path(__file__).with_name("coverage.py"))
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)


class CoverageGateTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "Cargo.toml").write_text('[workspace]\nmembers = ["crates/*"]\n')
        self.paths = [
            "crates/ukodus-api/src/main.rs",
            "crates/ukodus-api/src/services/result_service.rs",
            "crates/ukodus-api/src/extractors/api_key.rs",
            "crates/ukodus-analyzer/src/main.rs",
        ]
        for relative in self.paths:
            path = self.source(relative, "fn example() {\n    work();\n}\n")
            (path.parents[len(Path(relative).parts) - 3] / "Cargo.toml").write_text('[package]\nname = "example"\n')
        self.lcov = self.root / "coverage.info"

    def source(self, relative, contents):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents)
        return path

    def record(self, relative, hits=(1, 1), functions=(1,)):
        return "\n".join([
            f"SF:{self.root / relative}",
            *(f"FN:{line},function_{line}" for line in functions),
            *(f"DA:{index},{hit}" for index, hit in enumerate(hits, 1)),
            "end_of_record",
        ]) + "\n"

    def report(self, extra="", omit=(), overrides=None):
        overrides = overrides or {}
        self.lcov.write_text("".join(
            self.record(path, overrides.get(path, (1, 1)))
            for path in self.paths if path not in omit
        ) + extra)
        return coverage.evaluate(self.root, self.lcov)

    def test_duplicate_records_union_hits_without_inflating_lines(self):
        report = self.report(self.record(self.paths[0], (0, 1)), overrides={self.paths[0]: (1, 0)})
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)
        self.assertEqual(report["checks"]["rust_workspace"]["covered"], 8)

    def test_zero_hits_remain_in_denominator_and_fail_critical_gate(self):
        report = self.report(overrides={self.paths[1]: (1, 0)})
        self.assertFalse(report["passed"])
        self.assertFalse(report["checks"]["result_verification"]["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)

    def test_missing_production_file_and_missing_function_fail_closed(self):
        report = self.report(omit=[self.paths[0]])
        self.assertFalse(report["passed"])
        self.assertEqual(report["missing_production_functions"][0]["function_lines"], [1])
        self.source(self.paths[0], "fn first() {}\nfn omitted() {}\n")
        report = self.report()
        self.assertFalse(report["passed"])
        self.assertEqual(report["missing_production_functions"][0]["function_lines"], [2])

    def test_only_separate_test_sources_and_external_dependencies_are_excluded(self):
        excluded = ["crates/ukodus-api/src/integration_tests.rs", "crates/ukodus-analyzer/src/tests.rs", "crates/ukodus-api/tests/http.rs", "vendor/dependency.rs"]
        for path in excluded:
            self.source(path, "fn uncovered_test() {}")
        report = self.report("".join(self.record(path, (0, 0)) for path in excluded))
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)

    def test_declarations_comments_strings_and_trait_signatures_do_not_require_mapping(self):
        self.source("crates/ukodus-api/src/models.rs", '''// fn example() {}
/* fn example() {} */
const EXAMPLE: &str = r#"fn example() {}"#;
pub struct Model { pub value: i32 }
trait Read { fn read(&self) -> i32; }
''')
        report = self.report()
        self.assertTrue(report["passed"])
        self.assertIn("crates/ukodus-api/src/models.rs", report["sources_without_executable_mappings"])

    def test_inline_tests_are_rejected_instead_of_counted_as_production(self):
        self.source(self.paths[0], "fn example() {}\n#[cfg(test)]\nmod tests { fn test() {} }\n")
        with self.assertRaisesRegex(ValueError, "Move inline tests"):
            self.report()

    def test_empty_and_invalid_reports_fail(self):
        self.lcov.write_text("")
        self.assertFalse(coverage.evaluate(self.root, self.lcov)["passed"])
        self.lcov.write_text(self.record(self.paths[0], (1, -1)))
        with self.assertRaisesRegex(ValueError, "Invalid DA"):
            coverage.evaluate(self.root, self.lcov)


if __name__ == "__main__":
    unittest.main()
