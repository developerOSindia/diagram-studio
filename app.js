/**
 * DeveloperOS Diagram Studio Client Logic
 */

function updatePreview() {
  const source = document.getElementById("diagram-source").value;
  const preview = document.getElementById("raw-preview");
  preview.textContent = source;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("render-btn");
  if (btn) btn.addEventListener("click", updatePreview);
  const textarea = document.getElementById("diagram-source");
  if (textarea) textarea.addEventListener("input", updatePreview);
  updatePreview();
});
