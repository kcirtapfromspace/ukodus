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

    def test_new_unmapped_production_module_fails_closed(self):
        relative = "crates/ukodus-analyzer/src/arithmetic_cli.rs"
        self.source(relative, "pub fn verify() {}\n")
        report = self.report()
        self.assertFalse(report["passed"])
        self.assertIn(
            {"file": relative, "function_lines": [1]},
            report["missing_production_functions"],
        )

    def test_functions_without_executable_lines_fail_closed(self):
        report = self.report(
            self.record(self.paths[0], hits=()), omit=[self.paths[0]],
        )
        self.assertFalse(report["passed"])
        self.assertIn(
            {"file": self.paths[0], "reason": "No executable line mappings"},
            report["missing_production_functions"],
        )

    def test_only_separate_test_sources_and_external_dependencies_are_excluded(self):
        excluded = ["crates/ukodus-api/src/integration_tests.rs", "crates/ukodus-analyzer/src/tests.rs", "crates/ukodus-api/tests/http.rs", "vendor/dependency.rs"]
        for path in excluded:
            self.source(path, "fn uncovered_test() {}")
        report = self.report("".join(self.record(path, (0, 0)) for path in excluded))
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)

    def test_numeric_copies_of_test_sources_remain_excluded(self):
        copies = [
            "crates/ukodus-analyzer/src/tests 2.rs",
            "crates/ukodus-api/src/integration_tests 2.rs",
            "crates/ukodus-api/src/services/result_service_tests 12.rs",
        ]
        for relative in copies:
            self.source(relative, "fn uncovered_test_copy() {}\n")
        report = self.report("".join(self.record(path, (0, 0)) for path in copies))
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)
        for relative in copies:
            self.assertNotIn(relative, report["files"])

    def test_numeric_copies_of_production_sources_still_require_mappings(self):
        relative = "crates/ukodus-analyzer/src/arithmetic_cli 2.rs"
        self.source(relative, "fn uncovered_production_copy() {}\n")
        report = self.report()
        self.assertFalse(report["passed"])
        self.assertIn(
            {"file": relative, "function_lines": [1]},
            report["missing_production_functions"],
        )

    def test_workspace_exclusions_do_not_hide_member_sources(self):
        (self.root / "Cargo.toml").write_text(
            '[workspace]\nmembers = ["crates/*"]\nexclude = ["crates/dependency"]\n'
        )
        excluded = "crates/dependency/src/lib.rs"
        self.source(excluded, "pub fn external_implementation() {}\n")
        self.source("crates/dependency/Cargo.toml", '[package]\nname = "dependency"\n')
        report = self.report(self.record(excluded, (0, 0)))
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)
        self.assertNotIn(excluded, report["files"])

    def test_root_package_and_unmapped_member_are_both_inventoried(self):
        (self.root / "Cargo.toml").write_text(
            '[package]\nname = "root"\n[workspace]\nmembers = ["crates/*"]\n'
        )
        self.source("src/lib.rs", "pub fn root_behavior() {}\n")
        self.source("crates/new-member/Cargo.toml", '[package]\nname = "new-member"\n')
        self.source("crates/new-member/src/lib.rs", "pub fn new_behavior() {}\n")
        report = self.report()
        self.assertFalse(report["passed"])
        self.assertEqual(
            {item["file"] for item in report["missing_production_functions"]},
            {"src/lib.rs", "crates/new-member/src/lib.rs"},
        )

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

    def test_array_signatures_cannot_hide_missing_function_mappings(self):
        path = self.source(self.paths[0], '''fn example() {}
fn solve(board: &[u8; 81]) -> Option<[u8; 81]> { None }
fn mutate(board: &mut [u8; 81]) {}
fn return_array() -> [u8; 81] { [0; 81] }
trait Read { fn read(&self, board: &[u8; 81]) -> [u8; 81]; }
''')
        self.assertEqual(coverage.function_lines(path), {1, 2, 3, 4})
        report = self.report()
        self.assertFalse(report["passed"])
        self.assertIn(
            {"file": self.paths[0], "function_lines": [2, 3, 4]},
            report["missing_production_functions"],
        )

    def test_nested_comments_and_character_literals_preserve_function_lines(self):
        path = self.source(self.paths[0], r'''/* outer /* nested */ fn fake() {} */
const QUOTE: char = '"';
const BYTE_QUOTE: u8 = b'"';
const ESCAPED: char = '\'';
fn real<'a>(value: &'a str) -> &'a str { "value" }
const RAW: &str = r##"fn fake() { " }"##;
const BYTE_RAW: &[u8] = br#"fn fake() {}"#;
// fn fake() {}
fn r#type() {}
''')
        self.assertEqual(coverage.function_lines(path), {5, 9})
        masked = coverage.mask_non_code(path.read_text())
        self.assertEqual(len(masked), len(path.read_text()))
        self.assertEqual(masked.count("\n"), path.read_text().count("\n"))

    def test_unterminated_nested_comment_fails_closed(self):
        self.source(self.paths[0], "/* outer /* nested */\nfn hidden() {}\n")
        with self.assertRaisesRegex(ValueError, "Unterminated Rust block comment"):
            self.report()

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

    def test_malformed_line_and_function_records_are_rejected(self):
        records = {
            "DA": ["", "1", "zero,1", "0,1", "1,-1"],
            "FN": ["", "zero,example", "0,example", "-1,example"],
        }
        for kind, entries in records.items():
            for entry in entries:
                with self.subTest(kind=kind, entry=entry):
                    self.lcov.write_text(f"SF:{self.paths[0]}\n{kind}:{entry}\nend_of_record\n")
                    with self.assertRaisesRegex(ValueError, f"Invalid {kind}"):
                        coverage.evaluate(self.root, self.lcov)

    def test_relative_paths_checksums_and_record_boundaries(self):
        records = "".join(self.record(path) for path in self.paths)
        records = records.replace(f"SF:{self.root}/", "SF:")
        records = records.replace("DA:1,1", "DA:1,1,checksum")
        records += "DA:999,0\nFN:999,outside_record\n"
        self.lcov.write_text(records)
        report = coverage.evaluate(self.root, self.lcov)
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks"]["rust_workspace"]["measured"], 8)


if __name__ == "__main__":
    unittest.main()
