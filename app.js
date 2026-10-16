/**
 * DeveloperOS Diagram Studio Client Logic
 */

const TEMPLATES = {
  arch: `graph TD
  User((Developer)) -->|HTTPS| Cloudflare[Cloudflare Pages CDN]
  Cloudflare -->|Route /tools| Directory[Central Tools Directory]
  Cloudflare -->|Route /suites| Streamlit[Streamlit Community Cloud]
  Streamlit -->|In-Memory Execution| PureCore[Core Pure Algorithms]
  PureCore -->|0ms Latency| Streamlit
  Directory -->|Local Storage| BrowserCache[Client Browser Cache]`,

  flow: `graph TD
  Start([Start Request]) --> CheckAuth{Auth Token Present?}
  CheckAuth -->|Yes| Validate[Verify JWT Claims]
  CheckAuth -->|No| Reject[Return 401 Unauthorized]
  Validate --> CacheHit{Cache Hit?}
  CacheHit -->|Yes| ReturnCached[Return 200 Cached Response]
  CacheHit -->|No| QueryDB[(Fetch from Database)]
  QueryDB --> WriteCache[Store in Redis Cache]
  WriteCache --> Respond[Return 200 Fresh Response]
  Respond --> End([Done])
  Reject --> End`,

  seq: `sequenceDiagram
  autonumber
  actor User as Engineer
  participant Client as Web Browser
  participant API as API Sentinel Gateway
  participant Core as Core In-Memory Engine

  User->>Client: Input JSON / cURL / Regex
  Client->>API: POST /transform (payload)
  API->>Core: Process in-memory (0ms storage)
  Core-->>API: Transformed Output
  API-->>Client: 200 OK + Payload
  Client-->>User: Display formatted result with 1-click copy`,

  state: `stateDiagram-v2
  [*] --> Idle
  Idle --> Parsing : User Input
  Parsing --> Valid : Parse Success
  Parsing --> Error : Invalid Syntax
  Valid --> Processing : User Executes
  Processing --> Ready : Result Generated
  Error --> Idle : User Clears
  Ready --> Idle : New Session
  Ready --> [*]`,

  git: `gitGraph
  commit id: "Initial Core Setup"
  branch feature/offline-engine
  checkout feature/offline-engine
  commit id: "Add in-memory algorithms"
  commit id: "Add unit tests (100% green)"
  checkout main
  merge feature/offline-engine id: "Merge Core Suite"
  branch release/v1.0
  checkout release/v1.0
  commit id: "Tag v1.0.0 Public Launch"`
};

let toastTimer = null;
function triggerToast(message) {
  const toast = document.getElementById("quick-toast");
  const msgEl = document.getElementById("quick-toast-msg");
  if (msgEl) msgEl.textContent = message;
  if (toast) {
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }
}

function updatePreview() {
  const textarea = document.getElementById("diagram-source");
  const preview = document.getElementById("raw-preview");
  if (textarea && preview) {
    preview.textContent = textarea.value;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnRender = document.getElementById("render-btn");
  if (btnRender) btnRender.addEventListener("click", updatePreview);

  const textarea = document.getElementById("diagram-source");
  if (textarea) textarea.addEventListener("input", updatePreview);

  // Template buttons
  const tmplButtons = document.querySelectorAll(".tmpl-btn");
  tmplButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tmplButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tmplKey = btn.getAttribute("data-tmpl");
      if (TEMPLATES[tmplKey] && textarea) {
        textarea.value = TEMPLATES[tmplKey];
        updatePreview();
        triggerToast(`Loaded ${btn.textContent} template 🎨`);
      }
    });
  });

  // Copy Mermaid Definition
  const btnCopyMermaid = document.getElementById("btn-copy-mermaid");
  if (btnCopyMermaid && textarea) {
    btnCopyMermaid.addEventListener("click", () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        triggerToast("Copied Mermaid definition! 📋");
      });
    });
  }

  // Copy Preview Output
  const btnCopyPreview = document.getElementById("btn-copy-preview");
  const preview = document.getElementById("raw-preview");
  if (btnCopyPreview && preview) {
    btnCopyPreview.addEventListener("click", () => {
      navigator.clipboard.writeText(preview.textContent).then(() => {
        triggerToast("Copied diagram output! ✓");
      });
    });
  }

  updatePreview();
});
