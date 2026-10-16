"""
Automated validation for Diagram Studio portal assets.
"""

import unittest
from pathlib import Path

DIR_ROOT = Path(__file__).resolve().parent.parent


class TestDiagramStudio(unittest.TestCase):
    def test_essential_files_exist(self):
        self.assertTrue((DIR_ROOT / "index.html").exists())
        self.assertTrue((DIR_ROOT / "styles.css").exists())
        self.assertTrue((DIR_ROOT / "app.js").exists())
        self.assertTrue((DIR_ROOT / "package.json").exists())

    def test_html_content(self):
        content = (DIR_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("Diagram Studio", content)
        self.assertIn("diagram-source", content)


if __name__ == "__main__":
    unittest.main()
