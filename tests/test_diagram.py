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

    def test_html_structure_and_seo(self):
        content = (DIR_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("DeveloperOS Diagram Studio", content)
        self.assertIn('id="diagram-source"', content)
        self.assertIn('id="render-btn"', content)
        self.assertIn('id="raw-preview"', content)
        self.assertIn('class="devos-promotional-banner"', content)
        self.assertIn('https://developeros.in', content)

    def test_styles_rules(self):
        css = (DIR_ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".studio-layout", css)
        self.assertIn(".editor-pane", css)
        self.assertIn(".preview-pane", css)

    def test_client_javascript(self):
        js = (DIR_ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("function updatePreview", js)
        self.assertIn("DOMContentLoaded", js)


if __name__ == "__main__":
    unittest.main()
