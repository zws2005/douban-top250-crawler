import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "clean_analyze.py"
COLUMNS = ["rank", "title", "subtitle", "author_info", "rating_raw", "rating_count_raw", "quote", "url", "cover_url", "fetched_at"]


class CleanTest(unittest.TestCase):
    def test_cleans_bad_rows(self):
        rows = [
            ["1", "红楼梦", "", "曹雪芹 / 人民文学出版社 / 1996-12 / 59.70元", "9.7", "(100人评价)", "", "u1", "", "2026-01-01"],
            ["2", "红楼梦", "", "曹雪芹 / 人民文学出版社 / 1996-12 / 59.70元", "9.7", "(100人评价)", "", "u1", "", "2026-01-01"],
            ["3", "", "", "", "9", "(1人评价)", "", "u3", "", "2026-01-01"],
            ["x", "异常书", "", "作者 / 测试出版社 / 2020 / 30.00", "bad", "未知", "", "u4", "", "bad"],
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            raw, clean, report = tmp / "raw.csv", tmp / "clean.csv", tmp / "report.md"
            pd.DataFrame(rows, columns=COLUMNS).to_csv(raw, index=False, encoding="utf-8-sig")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--input", str(raw), "--clean-output", str(clean), "--report", str(report)],
                capture_output=True, text=True
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            df = pd.read_csv(clean)
            self.assertEqual(len(df), 2)
            self.assertFalse(df["rating"].isna().any())
            self.assertIn("异常书", set(df["title"]))
            self.assertTrue(report.exists())


if __name__ == "__main__":
    unittest.main()
