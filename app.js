/**
 * DeveloperOS Diagram Studio Client Logic
 * In-Memory SVG Diagram Engine, Visual Controls, and Zero-Telemetry Exporters
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
  WriteCache --> Respond[Return 20Fresh Response]
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

// Toast notification helper
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

// XML escaping utility
function escapeXml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Common SVG definitions: markers, gradients, filters
function generateSvgDefs() {
  return `
    <defs>
      <linearGradient id="grad-node" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#182234"/>
        <stop offset="100%" stop-color="#0c131f"/>
      </linearGradient>
      <linearGradient id="grad-diamond" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2a170b"/>
        <stop offset="100%" stop-color="#140b04"/>
      </linearGradient>
      <linearGradient id="grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#ea580c"/>
      </linearGradient>
      <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10b981"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>

      <!-- Drop shadow filter -->
      <filter id="devos-shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
      </filter>

      <!-- Arrow Markers -->
      <marker id="arrow-cyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#06b6d4"/>
      </marker>
      <marker id="arrow-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f97316"/>
      </marker>
      <marker id="arrow-gray" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748b"/>
      </marker>
      <marker id="circle-end" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
        <circle cx="5" cy="5" r="3.5" fill="#06b6d4"/>
      </marker>
    </defs>
  `;
}

// Parse individual node syntax
function parseNodeToken(token) {
  token = (token || "").trim();
  if (!token) return null;

  // Cylinder: id[(label)]
  let m = token.match(/^([a-zA-Z0-9_$-]+)\[\(([\s\S]*?)\)\]$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "cylinder" };

  // Subroutine: id[[label]]
  m = token.match(/^([a-zA-Z0-9_$-]+)\[\[([\s\S]*?)\]\]$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "subroutine" };

  // Stadium: id([label])
  m = token.match(/^([a-zA-Z0-9_$-]+)\(\[([\s\S]*?)\]\)$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "stadium" };

  // Circle: id((label))
  m = token.match(/^([a-zA-Z0-9_$-]+)\(\(([\s\S]*?)\)\)$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "circle" };

  // Diamond: id{label}
  m = token.match(/^([a-zA-Z0-9_$-]+)\{([\s\S]*?)\}$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "diamond" };

  // Rounded: id(label)
  m = token.match(/^([a-zA-Z0-9_$-]+)\(([\s\S]*?)\)$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "rounded" };

  // Rect: id[label]
  m = token.match(/^([a-zA-Z0-9_$-]+)\[([\s\S]*?)\]$/);
  if (m) return { id: m[1], label: m[2].trim(), shape: "rect" };

  // Plain ID: id
  m = token.match(/^([a-zA-Z0-9_$-]+)$/);
  if (m) return { id: m[1], label: m[1], shape: "rect" };

  return { id: token, label: token, shape: "rect" };
}

// Flowchart / Graph SVG Generator
function renderGraphSvg(lines, direction) {
  const isLR = direction === "LR" || direction === "RL";
  const nodesMap = new Map();
  const edgesList = [];

  const connRegex = /\s*(-->|==>|-\.->|---|--)\s*(?:\|([^|]*)\|)?\s*/g;

  lines.forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("%%") || line.startsWith("subgraph") || line === "end" || line.startsWith("classDef") || line.startsWith("class ")) {
      return;
    }

    connRegex.lastIndex = 0;
    const matches = [];
    let match;
    while ((match = connRegex.exec(line)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        arrowType: match[1],
        label: match[2] ? match[2].trim() : ""
      });
    }

    if (matches.length === 0) {
      const node = parseNodeToken(line);
      if (node && !nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
      }
      return;
    }

    const segments = [];
    let lastIdx = 0;
    for (let i = 0; i < matches.length; i++) {
      segments.push(line.slice(lastIdx, matches[i].index).trim());
      lastIdx = matches[i].index + matches[i].length;
    }
    segments.push(line.slice(lastIdx).trim());

    for (let i = 0; i < matches.length; i++) {
      const fromNode = parseNodeToken(segments[i]);
      const toNode = parseNodeToken(segments[i + 1]);

      if (fromNode) {
        if (!nodesMap.has(fromNode.id) || (fromNode.label !== fromNode.id && nodesMap.get(fromNode.id).label === fromNode.id)) {
          nodesMap.set(fromNode.id, fromNode);
        }
      }
      if (toNode) {
        if (!nodesMap.has(toNode.id) || (toNode.label !== toNode.id && nodesMap.get(toNode.id).label === toNode.id)) {
          nodesMap.set(toNode.id, toNode);
        }
      }

      if (fromNode && toNode) {
        edgesList.push({
          from: fromNode.id,
          to: toNode.id,
          arrowType: matches[i].arrowType,
          label: matches[i].label
        });
      }
    }
  });

  const nodeIds = Array.from(nodesMap.keys());
  if (nodeIds.length === 0) {
    return renderFallbackSvg("No diagram elements found in definition.");
  }

  // Calculate in-degree for layering
  const inDegree = {};
  const adjacency = {};
  nodeIds.forEach((id) => {
    inDegree[id] = 0;
    adjacency[id] = [];
  });

  edgesList.forEach((edge) => {
    if (inDegree[edge.to] !== undefined) {
      inDegree[edge.to]++;
    }
    if (adjacency[edge.from]) {
      adjacency[edge.from].push(edge.to);
    }
  });

  // Layer assignment
  const rank = {};
  const queue = nodeIds.filter((id) => inDegree[id] === 0);
  if (queue.length === 0 && nodeIds.length > 0) {
    queue.push(nodeIds[0]); // Break potential cycle
  }

  queue.forEach((id) => (rank[id] = 0));
  const visited = new Set(queue);

  let step = 0;
  while (queue.length > 0 && step < 200) {
    step++;
    const curr = queue.shift();
    const currRank = rank[curr] || 0;
    (adjacency[curr] || []).forEach((nextId) => {
      rank[nextId] = Math.max(rank[nextId] || 0, currRank + 1);
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push(nextId);
      }
    });
  }

  // Assign any missed node
  nodeIds.forEach((id, idx) => {
    if (rank[id] === undefined) {
      rank[id] = idx;
    }
  });

  // Group into layers
  const maxRank = Math.max(...Object.values(rank), 0);
  const layers = Array.from({ length: maxRank + 1 }, () => []);
  nodeIds.forEach((id) => {
    layers[rank[id]].push(id);
  });

  // Calculate node dimensions
  const nodeLayout = {};
  nodeIds.forEach((id) => {
    const node = nodesMap.get(id);
    const labelLen = (node.label || id).length;
    let width = Math.max(140, Math.min(320, labelLen * 8 + 48));
    let height = 54;

    if (node.shape === "circle") {
      width = 76;
      height = 76;
    } else if (node.shape === "diamond") {
      width = Math.max(160, labelLen * 9 + 48);
      height = 68;
    } else if (node.shape === "cylinder") {
      width = Math.max(150, labelLen * 8 + 48);
      height = 64;
    } else if (node.shape === "stadium") {
      width = Math.max(130, labelLen * 8 + 44);
      height = 50;
    }

    nodeLayout[id] = { ...node, width, height, x: 0, y: 0 };
  });

  // Grid positioning
  let svgWidth = 800;
  let svgHeight = 600;
  const paddingX = 60;
  const paddingY = 60;
  const colGap = 40;
  const rowGap = 70;

  if (!isLR) {
    // Top-to-Bottom
    let maxLayerWidth = 0;
    layers.forEach((layer) => {
      let layerW = layer.reduce((sum, id) => sum + nodeLayout[id].width, 0) + Math.max(0, layer.length - 1) * colGap;
      if (layerW > maxLayerWidth) maxLayerWidth = layerW;
    });

    svgWidth = Math.max(860, maxLayerWidth + paddingX * 2);

    let currentY = paddingY;
    layers.forEach((layer) => {
      let maxH = Math.max(...layer.map((id) => nodeLayout[id].height), 54);
      let layerW = layer.reduce((sum, id) => sum + nodeLayout[id].width, 0) + Math.max(0, layer.length - 1) * colGap;
      let startX = (svgWidth - layerW) / 2;

      let currentX = startX;
      layer.forEach((id) => {
        const n = nodeLayout[id];
        n.x = currentX;
        n.y = currentY + (maxH - n.height) / 2;
        currentX += n.width + colGap;
      });

      currentY += maxH + rowGap;
    });

    svgHeight = Math.max(500, currentY + paddingY - rowGap / 2);
  } else {
    // Left-to-Right
    let maxLayerHeight = 0;
    layers.forEach((layer) => {
      let layerH = layer.reduce((sum, id) => sum + nodeLayout[id].height, 0) + Math.max(0, layer.length - 1) * rowGap;
      if (layerH > maxLayerHeight) maxLayerHeight = layerH;
    });

    svgHeight = Math.max(550, maxLayerHeight + paddingY * 2);

    let currentX = paddingX;
    layers.forEach((layer) => {
      let maxW = Math.max(...layer.map((id) => nodeLayout[id].width), 140);
      let layerH = layer.reduce((sum, id) => sum + nodeLayout[id].height, 0) + Math.max(0, layer.length - 1) * rowGap;
      let startY = (svgHeight - layerH) / 2;

      let currentY = startY;
      layer.forEach((id) => {
        const n = nodeLayout[id];
        n.x = currentX + (maxW - n.width) / 2;
        n.y = currentY;
        currentY += n.height + rowGap;
      });

      currentX += maxW + colGap + 30;
    });

    svgWidth = Math.max(860, currentX + paddingX);
  }

  // Draw Edges
  let edgesMarkup = "";
  edgesList.forEach((edge) => {
    const fromNode = nodeLayout[edge.from];
    const toNode = nodeLayout[edge.to];
    if (!fromNode || !toNode) return;

    let sx, sy, ex, ey;
    const isCycle = !isLR ? toNode.y <= fromNode.y : toNode.x <= fromNode.x;

    if (!isLR) {
      if (isCycle) {
        sx = fromNode.x + fromNode.width;
        sy = fromNode.y + fromNode.height / 2;
        ex = toNode.x + toNode.width;
        ey = toNode.y + toNode.height / 2;
      } else {
        sx = fromNode.x + fromNode.width / 2;
        sy = fromNode.y + fromNode.height;
        ex = toNode.x + toNode.width / 2;
        ey = toNode.y;
      }
    } else {
      if (isCycle) {
        sx = fromNode.x + fromNode.width / 2;
        sy = fromNode.y;
        ex = toNode.x + toNode.width / 2;
        ey = toNode.y;
      } else {
        sx = fromNode.x + fromNode.width;
        sy = fromNode.y + fromNode.height / 2;
        ex = toNode.x;
        ey = toNode.y + toNode.height / 2;
      }
    }

    let pathD = "";
    let midX = (sx + ex) / 2;
    let midY = (sy + ey) / 2;

    if (isCycle) {
      const loopOffset = 55;
      midX = Math.max(sx, ex) + loopOffset;
      pathD = `M ${sx} ${sy} C ${sx + loopOffset} ${sy}, ${ex + loopOffset} ${ey}, ${ex} ${ey}`;
    } else if (!isLR) {
      const dy = ey - sy;
      pathD = `M ${sx} ${sy} C ${sx} ${sy + dy * 0.5}, ${ex} ${ey - dy * 0.5}, ${ex} ${ey}`;
    } else {
      const dx = ex - sx;
      pathD = `M ${sx} ${sy} C ${sx + dx * 0.5} ${sy}, ${ex - dx * 0.5} ${ey}, ${ex} ${ey}`;
    }

    const isDashed = edge.arrowType === "-.->" || edge.arrowType === "--";
    const strokeDash = isDashed ? 'stroke-dasharray="6,4"' : "";
    const strokeColor = edge.arrowType === "==>" ? "#f97316" : "#06b6d4";
    const markerId = edge.arrowType === "==>" ? "url(#arrow-orange)" : "url(#arrow-cyan)";
    const strokeWidth = edge.arrowType === "==>" ? "2.5" : "1.8";

    edgesMarkup += `
      <g class="diagram-edge">
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} marker-end="${markerId}"/>
    `;

    if (edge.label) {
      const textLen = edge.label.length * 6.5 + 16;
      edgesMarkup += `
        <rect x="${midX - textLen / 2}" y="${midY - 11}" width="${textLen}" height="22" rx="4" fill="#080b11" stroke="#223046" stroke-width="1"/>
        <text x="${midX}" y="${midY + 4}" fill="#94a3b8" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" text-anchor="middle">${escapeXml(edge.label)}</text>
      `;
    }

    edgesMarkup += `</g>`;
  });

  // Draw Nodes
  let nodesMarkup = "";
  nodeIds.forEach((id) => {
    const n = nodeLayout[id];
    const { x, y, width: w, height: h, shape, label } = n;
    const textLabel = escapeXml(label || id);

    let shapeSvg = "";
    if (shape === "circle") {
      const r = w / 2;
      shapeSvg = `<circle cx="${x + r}" cy="${y + r}" r="${r}" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="2" filter="url(#devos-shadow)"/>`;
    } else if (shape === "stadium") {
      shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#grad-node)" stroke="#38bdf8" stroke-width="2" filter="url(#devos-shadow)"/>`;
    } else if (shape === "diamond") {
      const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
      shapeSvg = `<polygon points="${pts}" fill="url(#grad-diamond)" stroke="#f97316" stroke-width="2" filter="url(#devos-shadow)"/>`;
    } else if (shape === "cylinder") {
      shapeSvg = `
        <path d="M ${x},${y + 10} L ${x},${y + h - 10} A ${w / 2} 10 0 0 0 ${x + w},${y + h - 10} L ${x + w},${y + 10} Z" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="1.8" filter="url(#devos-shadow)"/>
        <ellipse cx="${x + w / 2}" cy="${y + 10}" rx="${w / 2}" ry="10" fill="#1b2537" stroke="#06b6d4" stroke-width="1.8"/>
        <path d="M ${x},${y + h - 10} A ${w / 2} 10 0 0 0 ${x + w},${y + h - 10}" fill="none" stroke="#06b6d4" stroke-width="1.8"/>
      `;
    } else if (shape === "subroutine") {
      shapeSvg = `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="1.8" filter="url(#devos-shadow)"/>
        <line x1="${x + 10}" y1="${y}" x2="${x + 10}" y2="${y + h}" stroke="#06b6d4" stroke-width="1.5"/>
        <line x1="${x + w - 10}" y1="${y}" x2="${x + w - 10}" y2="${y + h}" stroke="#06b6d4" stroke-width="1.5"/>
      `;
    } else if (shape === "rounded") {
      shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="1.8" filter="url(#devos-shadow)"/>`;
    } else {
      // standard rect
      shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#grad-node)" stroke="#22d3ee" stroke-width="1.8" filter="url(#devos-shadow)"/>`;
    }

    nodesMarkup += `
      <g class="diagram-node" data-id="${escapeXml(id)}">
        ${shapeSvg}
        <text x="${x + w / 2}" y="${y + h / 2 + 4.5}" fill="#f8fafc" font-size="13" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" text-anchor="middle">${textLabel}</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" style="background-color: transparent;">
      ${generateSvgDefs()}
      <g class="diagram-edges-layer">${edgesMarkup}</g>
      <g class="diagram-nodes-layer">${nodesMarkup}</g>
    </svg>
  `;
}

// Sequence Diagram SVG Generator
function renderSequenceSvg(lines) {
  const participantsMap = new Map();
  const messagesList = [];
  let isAutonumber = false;

  lines.forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("%%") || line.toLowerCase() === "sequencediagram") return;

    if (line.toLowerCase() === "autonumber") {
      isAutonumber = true;
      return;
    }

    // participant / actor
    const partMatch = line.match(/^(actor|participant)\s+([a-zA-Z0-9_$-]+)(?:\s+as\s+(.*))?$/i);
    if (partMatch) {
      const isActor = partMatch[1].toLowerCase() === "actor";
      const id = partMatch[2];
      const label = partMatch[3] ? partMatch[3].trim().replace(/^["']|["']$/g, "") : id;
      participantsMap.set(id, { id, label, isActor });
      return;
    }

    // message
    const msgMatch = line.match(/^([a-zA-Z0-9_$-]+)\s*(-->>|->>|-->|->)\s*([a-zA-Z0-9_$-]+)\s*:\s*(.*)$/);
    if (msgMatch) {
      const fromId = msgMatch[1];
      const arrowType = msgMatch[2];
      const toId = msgMatch[3];
      const text = msgMatch[4].trim();

      if (!participantsMap.has(fromId)) {
        participantsMap.set(fromId, { id: fromId, label: fromId, isActor: false });
      }
      if (!participantsMap.has(toId)) {
        participantsMap.set(toId, { id: toId, label: toId, isActor: false });
      }

      messagesList.push({ from: fromId, to: toId, arrowType, text });
    }
  });

  const partIds = Array.from(participantsMap.keys());
  if (partIds.length === 0) {
    return renderFallbackSvg("No sequence participants found.");
  }

  const colWidth = 160;
  const colGap = 50;
  const paddingX = 40;
  const topY = 25;
  const cardH = 42;
  const msgStart = 110;
  const msgSpacing = 56;

  const totalWidth = Math.max(860, partIds.length * colWidth + (partIds.length - 1) * colGap + paddingX * 2);
  const totalHeight = msgStart + messagesList.length * msgSpacing + cardH + 70;

  // X coords for each participant center
  const partCoords = {};
  partIds.forEach((id, idx) => {
    const cx = paddingX + colWidth / 2 + idx * (colWidth + colGap);
    partCoords[id] = cx;
  });

  // Participant boxes and lifelines
  let partMarkup = "";
  partIds.forEach((id) => {
    const p = participantsMap.get(id);
    const cx = partCoords[id];
    const label = escapeXml(p.label);
    const bottomY = totalHeight - 45 - cardH;

    // Lifeline
    partMarkup += `<line x1="${cx}" y1="${topY + cardH}" x2="${cx}" y2="${bottomY}" stroke="#223046" stroke-width="1.8" stroke-dasharray="5,5"/>`;

    // Top Card
    partMarkup += `
      <g class="seq-actor-top">
        <rect x="${cx - colWidth / 2}" y="${topY}" width="${colWidth}" height="${cardH}" rx="8" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="1.8" filter="url(#devos-shadow)"/>
        <text x="${cx}" y="${topY + 25}" fill="#f8fafc" font-size="12.5" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" text-anchor="middle">${label}</text>
      </g>
    `;

    // Bottom Card
    partMarkup += `
      <g class="seq-actor-bottom">
        <rect x="${cx - colWidth / 2}" y="${bottomY}" width="${colWidth}" height="${cardH}" rx="8" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="1.8" filter="url(#devos-shadow)"/>
        <text x="${cx}" y="${bottomY + 25}" fill="#f8fafc" font-size="12.5" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" text-anchor="middle">${label}</text>
      </g>
    `;
  });

  // Messages
  let messagesMarkup = "";
  messagesList.forEach((msg, idx) => {
    const cx1 = partCoords[msg.from] || paddingX;
    const cx2 = partCoords[msg.to] || paddingX + 200;
    const y = msgStart + idx * msgSpacing;
    const isDashed = msg.arrowType === "-->>" || msg.arrowType === "-->";
    const dashAttr = isDashed ? 'stroke-dasharray="6,4"' : "";
    const isReturn = msg.arrowType === "-->>" || msg.arrowType === "-->";
    const strokeColor = isReturn ? "#38bdf8" : "#f97316";
    const marker = isReturn ? "url(#arrow-cyan)" : "url(#arrow-orange)";

    // Autonumber badge
    let numberBadge = "";
    if (isAutonumber) {
      numberBadge = `
        <circle cx="${cx1 + (cx2 > cx1 ? 14 : -14)}" cy="${y}" r="8.5" fill="#f97316"/>
        <text x="${cx1 + (cx2 > cx1 ? 14 : -14)}" y="${y + 3.5}" fill="#ffffff" font-size="9" font-weight="700" text-anchor="middle" font-family="monospace">${idx + 1}</text>
      `;
    }

    // Message line
    const startX = isAutonumber ? cx1 + (cx2 > cx1 ? 24 : -24) : cx1;
    messagesMarkup += `
      <g class="seq-message">
        ${numberBadge}
        <line x1="${startX}" y1="${y}" x2="${cx2}" y2="${y}" stroke="${strokeColor}" stroke-width="1.8" ${dashAttr} marker-end="${marker}"/>
        <text x="${(cx1 + cx2) / 2}" y="${y - 8}" fill="#e2e8f0" font-size="11.5" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" text-anchor="middle">${escapeXml(msg.text)}</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="background-color: transparent;">
      ${generateSvgDefs()}
      ${partMarkup}
      ${messagesMarkup}
    </svg>
  `;
}

// State Diagram SVG Generator
function renderStateSvg(lines) {
  const statesMap = new Map();
  const transitions = [];

  lines.forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("%%") || line.startsWith("stateDiagram")) return;

    const m = line.match(/^([^\s\-=>:]+)\s*-->\s*([^\s\-=>:]+)(?:\s*:\s*(.*))?$/);
    if (m) {
      let fromId = m[1].trim();
      let toId = m[2].trim();
      const label = m[3] ? m[3].trim() : "";

      if (fromId === "[*]") {
        fromId = "[*_start]";
        statesMap.set(fromId, { id: fromId, label: "Start", type: "start" });
      } else if (!statesMap.has(fromId)) {
        statesMap.set(fromId, { id: fromId, label: fromId, type: "state" });
      }

      if (toId === "[*]") {
        toId = "[*_end]";
        statesMap.set(toId, { id: toId, label: "End", type: "end" });
      } else if (!statesMap.has(toId)) {
        statesMap.set(toId, { id: toId, label: toId, type: "state" });
      }

      transitions.push({ from: fromId, to: toId, label });
    }
  });

  const stateIds = Array.from(statesMap.keys());
  if (stateIds.length === 0) {
    return renderFallbackSvg("No state transitions found.");
  }

  // Linear / multi-layer positioning
  const nodeW = 140;
  const nodeH = 50;
  const colGap = 40;
  const rowGap = 65;
  const cols = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(stateIds.length))));
  const totalWidth = Math.max(860, cols * (nodeW + colGap) + 120);

  const coords = {};
  stateIds.forEach((id, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 70 + col * (nodeW + colGap + 60);
    const y = 60 + row * (nodeH + rowGap);
    coords[id] = { x, y, width: nodeW, height: nodeH, ...statesMap.get(id) };
  });

  const maxRow = Math.floor((stateIds.length - 1) / cols);
  const totalHeight = Math.max(500, (maxRow + 1) * (nodeH + rowGap) + 80);

  let transMarkup = "";
  transitions.forEach((tr) => {
    const from = coords[tr.from];
    const to = coords[tr.to];
    if (!from || !to) return;

    let sx = from.x + from.width / 2;
    let sy = from.y + from.height;
    let ex = to.x + to.width / 2;
    let ey = to.y;

    if (from.y === to.y) {
      if (from.x < to.x) {
        sx = from.x + from.width;
        sy = from.y + from.height / 2;
        ex = to.x;
        ey = to.y + to.height / 2;
      } else {
        sx = from.x;
        sy = from.y + from.height / 2;
        ex = to.x + to.width;
        ey = to.y + to.height / 2;
      }
    } else if (from.y > to.y) {
      // backward transition loop
      sx = from.x + from.width;
      sy = from.y + from.height / 2;
      ex = to.x + to.width;
      ey = to.y + to.height / 2;
    }

    const isLoop = from.y > to.y;
    let pathD = "";
    let mx = (sx + ex) / 2;
    let my = (sy + ey) / 2;

    if (isLoop) {
      mx = Math.max(sx, ex) + 40;
      pathD = `M ${sx} ${sy} C ${sx + 50} ${sy}, ${ex + 50} ${ey}, ${ex} ${ey}`;
    } else {
      pathD = `M ${sx} ${sy} C ${sx} ${sy + (ey - sy) * 0.5}, ${ex} ${ey - (ey - sy) * 0.5}, ${ex} ${ey}`;
    }

    transMarkup += `
      <path d="${pathD}" fill="none" stroke="#06b6d4" stroke-width="1.8" marker-end="url(#arrow-cyan)"/>
    `;

    if (tr.label) {
      const textLen = tr.label.length * 6.5 + 14;
      transMarkup += `
        <rect x="${mx - textLen / 2}" y="${my - 10}" width="${textLen}" height="20" rx="4" fill="#0c111a" stroke="#223046" stroke-width="1"/>
        <text x="${mx}" y="${my + 4}" fill="#94a3b8" font-size="10.5" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" text-anchor="middle">${escapeXml(tr.label)}</text>
      `;
    }
  });

  let statesMarkup = "";
  stateIds.forEach((id) => {
    const st = coords[id];
    if (st.type === "start") {
      statesMarkup += `
        <g class="state-node">
          <circle cx="${st.x + 20}" cy="${st.y + 20}" r="14" fill="#06b6d4" stroke="#ffffff" stroke-width="2.5" filter="url(#devos-shadow)"/>
          <text x="${st.x + 20}" y="${st.y + 48}" fill="#94a3b8" font-size="11" text-anchor="middle">[*] Start</text>
        </g>
      `;
    } else if (st.type === "end") {
      statesMarkup += `
        <g class="state-node">
          <circle cx="${st.x + 20}" cy="${st.y + 20}" r="16" fill="none" stroke="#f97316" stroke-width="2"/>
          <circle cx="${st.x + 20}" cy="${st.y + 20}" r="9" fill="#f97316" filter="url(#devos-shadow)"/>
          <text x="${st.x + 20}" y="${st.y + 50}" fill="#94a3b8" font-size="11" text-anchor="middle">[*] Done</text>
        </g>
      `;
    } else {
      statesMarkup += `
        <g class="state-node">
          <rect x="${st.x}" y="${st.y}" width="${st.width}" height="${st.height}" rx="12" fill="url(#grad-node)" stroke="#06b6d4" stroke-width="1.8" filter="url(#devos-shadow)"/>
          <rect x="${st.x}" y="${st.y}" width="${st.width}" height="10" rx="4" fill="#06b6d4" opacity="0.15"/>
          <text x="${st.x + st.width / 2}" y="${st.y + st.height / 2 + 4}" fill="#f8fafc" font-size="13" font-weight="600" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">${escapeXml(st.label)}</text>
        </g>
      `;
    }
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="background-color: transparent;">
      ${generateSvgDefs()}
      ${transMarkup}
      ${statesMarkup}
    </svg>
  `;
}

// GitGraph SVG Generator
function renderGitGraphSvg(lines) {
  const gitData = {
    branches: ["main"],
    currentBranch: "main",
    commits: []
  };

  const branchColors = {
    main: "#f97316",
    "feature/offline-engine": "#06b6d4",
    "release/v1.0": "#10b981",
    develop: "#8b5cf6",
    staging: "#eab308"
  };

  const palette = ["#f97316", "#06b6d4", "#10b981", "#8b5cf6", "#eab308", "#ec4899"];

  lines.forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("%%") || line.startsWith("gitGraph")) return;

    // commit
    const commitMatch = line.match(/^commit(?:\s+id:\s*["']([^"']+)["'])?(?:\s+tag:\s*["']([^"']+)["'])?/i);
    if (commitMatch) {
      const id = commitMatch[1] || `commit-${gitData.commits.length + 1}`;
      const tag = commitMatch[2] || "";
      gitData.commits.push({ type: "commit", id, tag, branch: gitData.currentBranch });
      return;
    }

    // branch
    const branchMatch = line.match(/^branch\s+([^\s]+)/i);
    if (branchMatch) {
      const name = branchMatch[1];
      if (!gitData.branches.includes(name)) gitData.branches.push(name);
      gitData.currentBranch = name;
      return;
    }

    // checkout
    const coMatch = line.match(/^checkout\s+([^\s]+)/i);
    if (coMatch) {
      const name = coMatch[1];
      if (!gitData.branches.includes(name)) gitData.branches.push(name);
      gitData.currentBranch = name;
      return;
    }

    // merge
    const mergeMatch = line.match(/^merge\s+([^\s]+)(?:\s+id:\s*["']([^"']+)["'])?/i);
    if (mergeMatch) {
      const mergedBranch = mergeMatch[1];
      const id = mergeMatch[2] || `Merge ${mergedBranch}`;
      gitData.commits.push({ type: "merge", id, branch: gitData.currentBranch, mergedFrom: mergedBranch });
      return;
    }
  });

  const commits = gitData.commits;
  if (commits.length === 0) {
    return renderFallbackSvg("No git commits defined in gitGraph.");
  }

  const laneMap = {};
  gitData.branches.forEach((b, idx) => {
    laneMap[b] = idx;
    if (!branchColors[b]) {
      branchColors[b] = palette[idx % palette.length];
    }
  });

  const laneHeight = 85;
  const commitSpacing = 95;
  const startX = 220;
  const totalWidth = Math.max(860, startX + commits.length * commitSpacing + 100);
  const totalHeight = Math.max(480, gitData.branches.length * laneHeight + 120);

  // Draw branch lanes and headers
  let lanesMarkup = "";
  gitData.branches.forEach((b) => {
    const laneY = 70 + laneMap[b] * laneHeight;
    const col = branchColors[b];

    lanesMarkup += `
      <rect x="20" y="${laneY - 16}" width="165" height="32" rx="6" fill="#121824" stroke="${col}" stroke-width="1.6"/>
      <circle cx="36" cy="${laneY}" r="5" fill="${col}"/>
      <text x="50" y="${laneY + 4.5}" fill="${col}" font-size="12" font-weight="700" font-family="monospace">${escapeXml(b)}</text>
      <line x1="195" y1="${laneY}" x2="${totalWidth - 30}" y2="${laneY}" stroke="#1e293b" stroke-width="1.8" stroke-dasharray="4,4"/>
    `;
  });

  // Position commits
  const commitPositions = [];
  commits.forEach((c, idx) => {
    const cx = startX + idx * commitSpacing;
    const cy = 70 + (laneMap[c.branch] || 0) * laneHeight;
    commitPositions.push({ ...c, cx, cy });
  });

  // Connecting branch paths
  let connectionsMarkup = "";
  for (let i = 1; i < commitPositions.length; i++) {
    const prev = commitPositions[i - 1];
    const curr = commitPositions[i];
    const col = branchColors[curr.branch] || "#06b6d4";

    if (curr.type === "merge") {
      // Find last commit of merged branch
      const mergedFromCommits = commitPositions.slice(0, i).filter((p) => p.branch === curr.mergedFrom);
      const mergeSource = mergedFromCommits[mergedFromCommits.length - 1] || prev;
      connectionsMarkup += `
        <path d="M ${mergeSource.cx} ${mergeSource.cy} C ${mergeSource.cx + 40} ${mergeSource.cy}, ${curr.cx - 40} ${curr.cy}, ${curr.cx} ${curr.cy}" fill="none" stroke="${branchColors[curr.mergedFrom] || col}" stroke-width="2.5"/>
      `;
    }

    if (prev.branch === curr.branch) {
      connectionsMarkup += `<line x1="${prev.cx}" y1="${prev.cy}" x2="${curr.cx}" y2="${curr.cy}" stroke="${col}" stroke-width="2.5"/>`;
    } else {
      connectionsMarkup += `
        <path d="M ${prev.cx} ${prev.cy} C ${prev.cx + 35} ${prev.cy}, ${curr.cx - 35} ${curr.cy}, ${curr.cx} ${curr.cy}" fill="none" stroke="${col}" stroke-width="2.5"/>
      `;
    }
  }

  // Draw commit nodes
  let nodesMarkup = "";
  commitPositions.forEach((c) => {
    const col = branchColors[c.branch] || "#06b6d4";
    nodesMarkup += `
      <g class="git-commit">
        <circle cx="${c.cx}" cy="${c.cy}" r="9" fill="#0c0f15" stroke="${col}" stroke-width="3" filter="url(#devos-shadow)"/>
        <text x="${c.cx}" y="${c.cy + 24}" fill="#94a3b8" font-size="10.5" font-family="monospace" text-anchor="middle">${escapeXml(c.id)}</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="background-color: transparent;">
      ${generateSvgDefs()}
      ${lanesMarkup}
      ${connectionsMarkup}
      ${nodesMarkup}
    </svg>
  `;
}

// Fallback informative SVG renderer
function renderFallbackSvg(message) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" style="background: transparent;">
      ${generateSvgDefs()}
      <rect x="50" y="50" width="700" height="300" rx="12" fill="#0f141f" stroke="#223046" stroke-width="1.8"/>
      <circle cx="400" cy="140" r="32" fill="#1b2434" stroke="#06b6d4" stroke-width="2"/>
      <text x="400" y="148" fill="#06b6d4" font-size="24" text-anchor="middle" font-family="-apple-system, sans-serif">⚡</text>
      <text x="400" y="210" fill="#f8fafc" font-size="16" font-weight="700" text-anchor="middle" font-family="-apple-system, sans-serif">DeveloperOS Pure In-Memory Diagram</text>
      <text x="400" y="240" fill="#94a3b8" font-size="13" text-anchor="middle" font-family="-apple-system, sans-serif">${escapeXml(message)}</text>
    </svg>
  `;
}

// Main dispatcher: takes source string, parses, and returns complete SVG string
function renderMermaidSvg(source) {
  if (!source || !source.trim()) {
    return renderFallbackSvg("Enter Mermaid diagram syntax in the editor to visualize.");
  }

  const lines = source.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = (lines[0] || "").toLowerCase();

  try {
    if (firstLine.startsWith("sequencediagram")) {
      return renderSequenceSvg(lines);
    } else if (firstLine.startsWith("statediagram")) {
      return renderStateSvg(lines);
    } else if (firstLine.startsWith("gitgraph")) {
      return renderGitGraphSvg(lines);
    } else if (firstLine.startsWith("graph") || firstLine.startsWith("flowchart")) {
      const dirMatch = lines[0].match(/(?:graph|flowchart)\s+([A-Z]{2})/i);
      const direction = dirMatch ? dirMatch[1].toUpperCase() : "TD";
      return renderGraphSvg(lines.slice(1), direction);
    } else {
      // Default try parsing as graph lines
      return renderGraphSvg(lines, "TD");
    }
  } catch (err) {
    console.error("Diagram parsing error:", err);
    return renderFallbackSvg(`Parsing notice: ${err.message || "Invalid syntax"}`);
  }
}

// Global Zoom and Pan State
let zoomScale = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let startPointerX = 0;
let startPointerY = 0;

function applyTransform() {
  const wrapper = document.querySelector("#visual-preview .svg-viewport-wrapper");
  const zoomDisplay = document.getElementById("zoom-value");
  if (wrapper) {
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
  }
  if (zoomDisplay) {
    zoomDisplay.textContent = `${Math.round(zoomScale * 100)}%`;
  }
}

function zoomIn() {
  zoomScale = Math.min(3.0, +(zoomScale + 0.15).toFixed(2));
  applyTransform();
  triggerToast(`Zoom: ${Math.round(zoomScale * 100)}% 🔍`);
}

function zoomOut() {
  zoomScale = Math.max(0.3, +(zoomScale - 0.15).toFixed(2));
  applyTransform();
  triggerToast(`Zoom: ${Math.round(zoomScale * 100)}% 🔍`);
}

function resetZoom() {
  zoomScale = 1.0;
  panX = 0;
  panY = 0;
  applyTransform();
  triggerToast("View reset ⟲");
}

function initZoomPan() {
  const container = document.getElementById("visual-preview");
  if (!container) return;

  // Mouse pan
  container.addEventListener("mousedown", (e) => {
    // Only drag on primary click
    if (e.button !== 0) return;
    isPanning = true;
    startPointerX = e.clientX - panX;
    startPointerY = e.clientY - panY;
    container.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    panX = e.clientX - startPointerX;
    panY = e.clientY - startPointerY;
    applyTransform();
  });

  window.addEventListener("mouseup", () => {
    if (isPanning) {
      isPanning = false;
      container.style.cursor = "grab";
    }
  });

  // Touch pan for tablet & mobile
  container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      startPointerX = e.touches[0].clientX - panX;
      startPointerY = e.touches[0].clientY - panY;
    }
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (isPanning && e.touches.length === 1) {
      panX = e.touches[0].clientX - startPointerX;
      panY = e.touches[0].clientY - startPointerY;
      applyTransform();
    }
  }, { passive: true });

  container.addEventListener("touchend", () => {
    isPanning = false;
  });

  // Wheel zoom
  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoomScale = Math.min(3.0, Math.max(0.3, +(zoomScale + delta).toFixed(2)));
    applyTransform();
  }, { passive: false });

  // Button listeners
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomReset = document.getElementById("btn-zoom-reset");

  if (btnZoomIn) btnZoomIn.addEventListener("click", zoomIn);
  if (btnZoomOut) btnZoomOut.addEventListener("click", zoomOut);
  if (btnZoomReset) btnZoomReset.addEventListener("click", resetZoom);
}

// View Mode Toggling Engine
function setViewMode(mode) {
  const studioLayout = document.querySelector(".studio-layout");
  const viewBtns = document.querySelectorAll(".view-mode-btn");

  viewBtns.forEach((btn) => {
    if (btn.getAttribute("data-view") === mode) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (studioLayout) {
    studioLayout.classList.remove("layout-split", "layout-visual-only", "layout-code-only");
    const targetClass = mode === "split" ? "layout-split" : (mode === "visual" ? "layout-visual-only" : "layout-code-only");
    studioLayout.classList.add(targetClass);
  }

  const modeLabels = {
    split: "Split View",
    visual: "Visual Only",
    code: "Code Only"
  };
  triggerToast(`Switched to ${modeLabels[mode] || mode} mode 📐`);
}

function initViewModes() {
  const viewBtns = document.querySelectorAll(".view-mode-btn");
  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-view");
      setViewMode(mode);
    });
  });
}

// Export Features Engine
function getRenderedSvgString() {
  const svgEl = document.querySelector("#visual-preview svg");
  if (!svgEl) return null;
  let svgString = new XMLSerializer().serializeToString(svgEl);
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svgString;
}

function downloadSvg() {
  const svgString = getRenderedSvgString();
  if (!svgString) {
    triggerToast("No diagram to export! ⚠️");
    return;
  }
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "developer-os-diagram.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  triggerToast("SVG diagram downloaded! 📥");
}

function copySvg() {
  const svgString = getRenderedSvgString();
  if (!svgString) {
    triggerToast("No diagram to copy! ⚠️");
    return;
  }
  navigator.clipboard.writeText(svgString).then(() => {
    triggerToast("SVG markup copied to clipboard! 📋");
  }).catch(() => {
    triggerToast("Failed to copy SVG to clipboard ⚠️");
  });
}

function exportDefinition() {
  const textarea = document.getElementById("diagram-source");
  if (!textarea || !textarea.value.trim()) {
    triggerToast("No definition to export! ⚠️");
    return;
  }
  const blob = new Blob([textarea.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "diagram.mmd";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  triggerToast("Diagram definition (.mmd) exported! 📥");
}

function initExports() {
  const btnDownloadSvg = document.getElementById("btn-download-svg");
  const btnCopySvg = document.getElementById("btn-copy-svg");
  const btnExportDef = document.getElementById("btn-export-def");

  if (btnDownloadSvg) btnDownloadSvg.addEventListener("click", downloadSvg);
  if (btnCopySvg) btnCopySvg.addEventListener("click", copySvg);
  if (btnExportDef) btnExportDef.addEventListener("click", exportDefinition);
}

// Preview Tabs (Visual vs Raw Output)
function initPreviewTabs() {
  const tabVisual = document.getElementById("tab-visual");
  const tabRaw = document.getElementById("tab-raw");
  const visualPreview = document.getElementById("visual-preview");
  const rawPreview = document.getElementById("raw-preview");

  if (tabVisual && tabRaw && visualPreview && rawPreview) {
    tabVisual.addEventListener("click", () => {
      tabVisual.classList.add("active");
      tabVisual.setAttribute("aria-selected", "true");
      tabRaw.classList.remove("active");
      tabRaw.setAttribute("aria-selected", "false");
      visualPreview.style.display = "flex";
      rawPreview.style.display = "none";
    });

    tabRaw.addEventListener("click", () => {
      tabRaw.classList.add("active");
      tabRaw.setAttribute("aria-selected", "true");
      tabVisual.classList.remove("active");
      tabVisual.setAttribute("aria-selected", "false");
      visualPreview.style.display = "none";
      rawPreview.style.display = "block";
    });
  }
}

// Core Update Function
function updatePreview() {
  const textarea = document.getElementById("diagram-source");
  const rawPreview = document.getElementById("raw-preview");
  const visualPreview = document.getElementById("visual-preview");

  if (textarea) {
    const code = textarea.value;

    // Preserve raw text output
    if (rawPreview) {
      rawPreview.textContent = code;
    }

    // Render interactive SVG
    if (visualPreview) {
      let wrapper = visualPreview.querySelector(".svg-viewport-wrapper");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "svg-viewport-wrapper";
        visualPreview.appendChild(wrapper);
      }
      wrapper.innerHTML = renderMermaidSvg(code);
      applyTransform();
    }
  }
}

// Setup on DOM Ready
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
        resetZoom();
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

  // Copy Preview Output (Preserved for existing tests & functionality)
  const btnCopyPreview = document.getElementById("btn-copy-preview");
  const preview = document.getElementById("raw-preview");
  if (btnCopyPreview && preview) {
    btnCopyPreview.addEventListener("click", () => {
      navigator.clipboard.writeText(preview.textContent).then(() => {
        triggerToast("Copied diagram output! ✓");
      });
    });
  }

  // Initialize interactive components
  initZoomPan();
  initViewModes();
  initExports();
  initPreviewTabs();

  // Initial render
  updatePreview();
});
