import { ArchitectureDiagram, GroupColor, NodeCategory, NodePositionMap } from '../types/architecture';
import {
  computeEdgeGeometry,
  computeGroupBounds,
  NODE_HEIGHT,
  NODE_WIDTH,
} from './layout';
import { diagramToMermaid } from './mermaid';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'architecture-diagram'
  );
}

const GROUP_PALETTE: Record<GroupColor, { fillDark: string; strokeDark: string; fillLight: string; strokeLight: string; text: string }> = {
  blue: {
    fillDark: 'rgba(30, 58, 138, 0.16)',
    strokeDark: '#3b82f6',
    fillLight: 'rgba(239, 246, 255, 0.85)',
    strokeLight: '#60a5fa',
    text: '#60a5fa',
  },
  purple: {
    fillDark: 'rgba(88, 28, 135, 0.16)',
    strokeDark: '#a855f7',
    fillLight: 'rgba(250, 245, 255, 0.85)',
    strokeLight: '#c084fc',
    text: '#c084fc',
  },
  emerald: {
    fillDark: 'rgba(6, 78, 59, 0.16)',
    strokeDark: '#10b981',
    fillLight: 'rgba(236, 253, 245, 0.85)',
    strokeLight: '#34d399',
    text: '#34d399',
  },
  amber: {
    fillDark: 'rgba(120, 53, 15, 0.16)',
    strokeDark: '#f59e0b',
    fillLight: 'rgba(255, 251, 235, 0.85)',
    strokeLight: '#fbbf24',
    text: '#fbbf24',
  },
  slate: {
    fillDark: 'rgba(30, 41, 59, 0.35)',
    strokeDark: '#64748b',
    fillLight: 'rgba(241, 245, 249, 0.85)',
    strokeLight: '#94a3b8',
    text: '#94a3b8',
  },
};

const CATEGORY_ACCENT: Record<NodeCategory, string> = {
  client: '#38bdf8',
  network: '#6366f1',
  compute: '#3b82f6',
  database: '#10b981',
  cache: '#f59e0b',
  queue: '#ec4899',
  storage: '#14b8a6',
  ai: '#a855f7',
  security: '#ef4444',
};

export function buildStandaloneSvg(
  diagram: ArchitectureDiagram,
  positions: NodePositionMap,
  isDark: boolean
): string {
  const groups = computeGroupBounds(diagram, positions);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of diagram.nodes) {
    const pos = positions[node.id];
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + NODE_WIDTH);
    maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
  }
  for (const g of groups) {
    minX = Math.min(minX, g.x);
    minY = Math.min(minY, g.y);
    maxX = Math.max(maxX, g.x + g.width);
    maxY = Math.max(maxY, g.y + g.height);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 500;
  }

  const pad = 64;
  const headerH = 56;
  const vx = minX - pad;
  const vy = minY - pad - headerH;
  const vw = Math.max(600, maxX - minX + pad * 2);
  const vh = Math.max(400, maxY - minY + pad * 2 + headerH);

  const bg = isDark ? '#0b0f17' : '#f8fafc';
  const cardBg = isDark ? '#111827' : '#ffffff';
  const cardStroke = isDark ? '#1e293b' : '#cbd5e1';
  const titleColor = isDark ? '#f8fafc' : '#0f172a';
  const subColor = isDark ? '#94a3b8' : '#475569';
  const labelMaskBg = isDark ? '#0b0f17' : '#f8fafc';

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${vx} ${vy} ${vw} ${vh}">`
  );
  parts.push(`<defs>
    <style>
      .arch-title { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 700; }
      .arch-label { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 600; }
      .arch-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
      .arch-body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    </style>
    <marker id="arrow-sync" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="${isDark ? '#60a5fa' : '#2563eb'}" />
    </marker>
    <marker id="arrow-async" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="${isDark ? '#f59e0b' : '#d97706'}" />
    </marker>
    <marker id="arrow-data" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="${isDark ? '#10b981' : '#059669'}" />
    </marker>
  </defs>`);

  parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${bg}" />`);

  // Title header
  parts.push(
    `<text x="${vx + 32}" y="${vy + 36}" class="arch-title" font-size="20" fill="${titleColor}">${escapeXml(diagram.title)}</text>`
  );
  parts.push(
    `<text x="${vx + 32}" y="${vy + 56}" class="arch-body" font-size="12" fill="${subColor}">${escapeXml(diagram.theme.toUpperCase())} · ${diagram.nodes.length} components · ${diagram.edges.length} connections</text>`
  );

  // Groups
  for (const g of groups) {
    const pal = GROUP_PALETTE[g.color] ?? GROUP_PALETTE.slate;
    const fill = isDark ? pal.fillDark : pal.fillLight;
    const stroke = isDark ? pal.strokeDark : pal.strokeLight;
    parts.push(
      `<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" rx="12" fill="${fill}" stroke="${stroke}" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="6 4" />`
    );
    parts.push(
      `<text x="${g.x + 14}" y="${g.y + 24}" class="arch-label" font-size="12" fill="${isDark ? pal.text : stroke}">${escapeXml(g.label)}</text>`
    );
  }

  // Edges
  for (const edge of diagram.edges) {
    const src = positions[edge.source];
    const tgt = positions[edge.target];
    if (!src || !tgt) continue;
    const geom = computeEdgeGeometry(src, tgt);
    const stroke =
      edge.type === 'async'
        ? isDark
          ? '#f59e0b'
          : '#d97706'
        : edge.type === 'data'
          ? isDark
            ? '#10b981'
            : '#059669'
          : isDark
            ? '#60a5fa'
            : '#2563eb';
    const dash = edge.type === 'async' ? 'stroke-dasharray="6 4"' : '';
    const width = edge.type === 'data' ? '2.2' : '1.75';
    parts.push(
      `<path d="${geom.path}" fill="none" stroke="${stroke}" stroke-width="${width}" ${dash} marker-end="url(#arrow-${edge.type})" />`
    );
    if (edge.label) {
      const labelW = Math.max(44, edge.label.length * 6.8 + 16);
      parts.push(
        `<rect x="${geom.labelX - labelW / 2}" y="${geom.labelY - 11}" width="${labelW}" height="22" rx="6" fill="${labelMaskBg}" stroke="${cardStroke}" stroke-width="1" />`
      );
      parts.push(
        `<text x="${geom.labelX}" y="${geom.labelY + 4}" text-anchor="middle" class="arch-mono" font-size="10.5" fill="${subColor}">${escapeXml(edge.label)}</text>`
      );
    }
  }

  // Nodes
  for (const node of diagram.nodes) {
    const pos = positions[node.id];
    if (!pos) continue;
    const accent = CATEGORY_ACCENT[node.category] ?? '#3b82f6';
    parts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="10" fill="${cardBg}" stroke="${cardStroke}" stroke-width="1.25" />`
    );
    parts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${NODE_WIDTH}" height="4" rx="2" fill="${accent}" />`
    );
    parts.push(
      `<text x="${pos.x + 14}" y="${pos.y + 24}" class="arch-mono" font-size="10" fill="${accent}">${escapeXml(node.category.toUpperCase())}</text>`
    );
    const labelText = node.label.length > 25 ? node.label.slice(0, 24) + '…' : node.label;
    const techText = node.tech.length > 28 ? node.tech.slice(0, 27) + '…' : node.tech;
    parts.push(
      `<text x="${pos.x + 14}" y="${pos.y + 48}" class="arch-label" font-size="13.5" fill="${titleColor}">${escapeXml(labelText)}</text>`
    );
    parts.push(
      `<text x="${pos.x + 14}" y="${pos.y + 70}" class="arch-mono" font-size="11" fill="${subColor}">${escapeXml(techText)}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAsSvg(
  diagram: ArchitectureDiagram,
  positions: NodePositionMap,
  isDark: boolean
) {
  const svg = buildStandaloneSvg(diagram, positions, isDark);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `${slugify(diagram.title)}.svg`);
}

export async function exportAsPng(
  diagram: ArchitectureDiagram,
  positions: NodePositionMap,
  isDark: boolean
): Promise<void> {
  const svg = buildStandaloneSvg(diagram, positions, isDark);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.documentElement;
  const width = Number(svgEl.getAttribute('width')) || 1200;
  const height = Number(svgEl.getAttribute('height')) || 800;

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to render diagram SVG to image'));
      image.src = url;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG encoding failed'));
      }, 'image/png');
    });

    triggerDownload(pngBlob, `${slugify(diagram.title)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function exportAsMermaid(diagram: ArchitectureDiagram) {
  const mmd = diagramToMermaid(diagram);
  const blob = new Blob([mmd], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${slugify(diagram.title)}.mmd`);
}

export function exportAsJson(diagram: ArchitectureDiagram) {
  const json = JSON.stringify(diagram, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, `${slugify(diagram.title)}.json`);
}
