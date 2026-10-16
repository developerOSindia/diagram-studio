"""
Automated validation for Diagram Studio portal assets.
Verifies SVG diagram engine, view mode controls, zoom & pan, exports, and zero CI/CD rule.
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

    def test_view_mode_controls(self):
        html = (DIR_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="btn-view-split"', html)
        self.assertIn('id="btn-view-visual"', html)
        self.assertIn('id="btn-view-code"', html)
        self.assertIn("Split View", html)
        self.assertIn("Visual Only", html)
        self.assertIn("Code Only", html)

        css = (DIR_ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".layout-split", css)
        self.assertIn(".layout-visual-only", css)
        self.assertIn(".layout-code-only", css)

        js = (DIR_ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("function setViewMode", js)
        self.assertIn("function initViewModes", js)

    def test_zoom_and_pan_controls(self):
        html = (DIR_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="btn-zoom-in"', html)
        self.assertIn('id="btn-zoom-out"', html)
        self.assertIn('id="btn-zoom-reset"', html)
        self.assertIn('id="zoom-value"', html)

        js = (DIR_ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("function initZoomPan", js)
        self.assertIn("function applyTransform", js)
        self.assertIn("function zoomIn", js)
        self.assertIn("function zoomOut", js)
        self.assertIn("function resetZoom", js)

    def test_export_controls(self):
        html = (DIR_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="btn-download-svg"', html)
        self.assertIn('id="btn-copy-svg"', html)
        self.assertIn('id="btn-export-def"', html)
        self.assertIn("Download SVG", html)
        self.assertIn("Copy SVG", html)
        self.assertIn("Export Definition", html)

        js = (DIR_ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("function downloadSvg", js)
        self.assertIn("function copySvg", js)
        self.assertIn("function exportDefinition", js)

    def test_visual_preview_container_and_svg_engine(self):
        html = (DIR_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="visual-preview"', html)
        self.assertIn('id="raw-preview"', html)

        js = (DIR_ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("function renderMermaidSvg", js)
        self.assertIn("function renderGraphSvg", js)
        self.assertIn("function renderSequenceSvg", js)
        self.assertIn("function renderStateSvg", js)
        self.assertIn("function renderGitGraphSvg", js)

    def test_touch_target_accessibility(self):
        css = (DIR_ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn("min-height: 44px", css)
        self.assertIn("touch-action: manipulation", css)

    def test_strict_no_cicd_policy(self):
        workflows_dir = DIR_ROOT / ".github" / "workflows"
        self.assertFalse(workflows_dir.exists(), "Strict rule violation: .github/workflows must never exist!")


if __name__ == "__main__":
    unittest.main()
