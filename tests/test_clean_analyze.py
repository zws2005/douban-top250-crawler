from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT_ROOT / "analysis" / "clean_analyze.py"

RAW_COLUMNS = [
    "rank",
    "title",
    "subtitle",
    "author_info",
    "rating_raw",
    "rating_count_raw",
    "quote",
    "url",
    "cover_url",
    "fetched_at",
]


class CleanAnalyzeIntegrationTest(unittest.TestCase):
    def test_cleans_missing_duplicate_and_malformed_rows(self) -> None:
        rows = [
            {
                "rank": "1",
                "title": "红楼梦",
                "subtitle": "",
                "author_info": "曹雪芹 / 人民文学出版社 / 1982-3 / 59.70元",
                "rating_raw": "9.7",
                "rating_count_raw": "(100人评价)",
                "quote": "测试",
                "url": "https://example.com/1",
                "cover_url": "",
                "fetched_at": "2026-11-02T00:00:00Z",
            },
            {
                "rank": "2",
                "title": "红楼梦",
                "subtitle": "",
                "author_info": "曹雪芹 / 人民文学出版社 / 1982-3 / 59.70元",
                "rating_raw": "9.7",
                "rating_count_raw": "(100人评价)",
                "quote": "测试",
                "url": "https://example.com/1",
                "cover_url": "",
                "fetched_at": "2026-11-02T00:00:00Z",
            },
            {
                "rank": "3",
                "title": "红楼梦",
                "subtitle": "",
                "author_info": "曹雪芹 / 人民文学出版社 / 1982-3 / 59.70元",
                "rating_raw": "9.6",
                "rating_count_raw": "(50人评价)",
                "quote": "",
                "url": "https://example.com/3",
                "cover_url": "",
                "fetched_at": "2026-11-02T00:00:00Z",
            },
            {
                "rank": "4",
                "title": "",
                "subtitle": "",
                "author_info": "",
                "rating_raw": "9.0",
                "rating_count_raw": "(10人评价)",
                "quote": "",
                "url": "https://example.com/4",
                "cover_url": "",
                "fetched_at": "2026-11-02T00:00:00Z",
            },
            {
                "rank": "not-a-rank",
                "title": "异常格式图书",
                "subtitle": "",
                "author_info": "作者 / 测试出版社 / 2020 / 30.00",
                "rating_raw": "not-a-rating",
                "rating_count_raw": "人数未知",
                "quote": "",
                "url": "https://example.com/5",
                "cover_url": "",
                "fetched_at": "not-a-date",
            },
        ]

        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            input_path = temporary_path / "raw.csv"
            clean_path = temporary_path / "clean.csv"
            analysis_dir = temporary_path / "analysis"
            pd.DataFrame(rows, columns=RAW_COLUMNS).to_csv(
                input_path, index=False, encoding="utf-8-sig"
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--input",
                    str(input_path),
                    "--clean-output",
                    str(clean_path),
                    "--analysis-dir",
                    str(analysis_dir),
                ],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            clean = pd.read_csv(clean_path)
            self.assertEqual(len(clean), 2)
            self.assertFalse(clean["rating"].isna().any())
            self.assertFalse(clean["rating_count"].isna().any())
            self.assertEqual(float(clean["rating"].median()), 9.7)
            self.assertEqual(int(clean["rating_count"].median()), 100)
            self.assertEqual(clean["publisher"].isna().sum(), 0)

            malformed = clean.loc[clean["title"] == "异常格式图书"].iloc[0]
            flags = str(malformed["data_quality_flags"])
            self.assertIn("invalid_rating_imputed", flags)
            self.assertIn("invalid_rating_count_imputed", flags)
            self.assertIn("missing_rank", flags)
            self.assertTrue((analysis_dir / "report.md").exists())
            self.assertTrue((analysis_dir / "figures" / "rating_distribution.png").exists())
            self.assertTrue((analysis_dir / "figures" / "publisher_distribution.png").exists())
            self.assertTrue((analysis_dir / "figures" / "rating_vs_reviews.png").exists())

            summary = json.loads((analysis_dir / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["original_rows"], 5)
            self.assertEqual(summary["clean_rows"], 2)
            self.assertEqual(summary["missing_title_removed"], 1)
            self.assertEqual(summary["exact_duplicates_removed"], 1)
            self.assertEqual(summary["title_duplicates_removed"], 1)
            self.assertEqual(summary["invalid_rating_imputed"], 1)
            self.assertEqual(summary["invalid_rating_count_imputed"], 1)


if __name__ == "__main__":
    unittest.main()
