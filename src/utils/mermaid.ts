import {
  ArchitectureDiagram,
  ArchitectureEdge,
  ArchitectureGroup,
  ArchitectureNode,
  EdgeType,
  GroupColor,
  NodeCategory,
} from '../types/architecture';

function sanitizeMermaidId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
  if (!cleaned) return 'node_item';
  return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned;
}

function escapeMermaidText(text: string): string {
  return text.replace(/"/g, "'").replace(/\n/g, ' ').trim();
}

function formatNodeShape(node: ArchitectureNode): string {
  const id = sanitizeMermaidId(node.id);
  const label = escapeMermaidText(node.label);
  const tech = escapeMermaidText(node.tech);
  const content = tech ? `"${label}<br/><small>${tech}</small>"` : `"${label}"`;

  switch (node.category) {
    case 'database':
    case 'storage':
      return `${id}[(${content})]`;
    case 'client':
      return `${id}([${content}])`;
    case 'queue':
    case 'ai':
      return `${id}{{${content}}}`;
    case 'cache':
    case 'security':
      return `${id}[[${content}]]`;
    case 'network':
      return `${id}{${content}}`;
    case 'compute':
    default:
      return `${id}[${content}]`;
  }
}

export function diagramToMermaid(diagram: ArchitectureDiagram): string {
  const lines: string[] = ['flowchart LR'];

  if (diagram.title) {
    lines.push(`  %% ${diagram.title}`);
  }

  const groupedNodeIds = new Set<string>();

  for (const group of diagram.groups) {
    const members = diagram.nodes.filter((n) => n.groupId === group.id);
    if (members.length === 0) continue;
    const gid = sanitizeMermaidId(group.id);
    lines.push(`  subgraph ${gid}["${escapeMermaidText(group.label)}"]`);
    for (const node of members) {
      groupedNodeIds.add(node.id);
      lines.push(`    ${formatNodeShape(node)}`);
    }
    lines.push('  end');
  }

  const ungrouped = diagram.nodes.filter((n) => !groupedNodeIds.has(n.id));
  if (ungrouped.length > 0) {
    for (const node of ungrouped) {
      lines.push(`  ${formatNodeShape(node)}`);
    }
  }

  if (diagram.edges.length > 0) {
    lines.push('');
    for (const edge of diagram.edges) {
      const src = sanitizeMermaidId(edge.source);
      const tgt = sanitizeMermaidId(edge.target);
      const label = escapeMermaidText(edge.label);

      if (edge.type === 'async') {
        lines.push(label ? `  ${src} -.->|"${label}"| ${tgt}` : `  ${src} -.-> ${tgt}`);
      } else if (edge.type === 'data') {
        lines.push(label ? `  ${src} ==>|"${label}"| ${tgt}` : `  ${src} ==> ${tgt}`);
      } else {
        lines.push(label ? `  ${src} -->|"${label}"| ${tgt}` : `  ${src} --> ${tgt}`);
      }
    }
  }

  return lines.join('\n');
}

const GROUP_COLORS: GroupColor[] = ['blue', 'purple', 'emerald', 'amber', 'slate'];

function parseNodeToken(token: string): {
  id: string;
  label?: string;
  tech?: string;
  category?: NodeCategory;
} | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  // Match shapes: id[("...")], id(["..."]), id{{"..."}}, id[["..."]], id{"..."}, id["..."]
  const patterns: Array<{ regex: RegExp; category: NodeCategory }> = [
    { regex: /^([a-zA-Z0-9_-]+)\[\(([\s\S]*?)\)\]$/, category: 'database' },
    { regex: /^([a-zA-Z0-9_-]+)\(\[([\s\S]*?)\]\)$/, category: 'client' },
    { regex: /^([a-zA-Z0-9_-]+)\{\{([\s\S]*?)\}\}$/, category: 'queue' },
    { regex: /^([a-zA-Z0-9_-]+)\[\[([\s\S]*?)\]\]$/, category: 'cache' },
    { regex: /^([a-zA-Z0-9_-]+)\{([\s\S]*?)\}$/, category: 'network' },
    { regex: /^([a-zA-Z0-9_-]+)\[([\s\S]*?)\]$/, category: 'compute' },
    { regex: /^([a-zA-Z0-9_-]+)\(([\s\S]*?)\)$/, category: 'compute' },
  ];

  for (const { regex, category } of patterns) {
    const m = trimmed.match(regex);
    if (m) {
      const id = m[1];
      let inner = m[2].trim().replace(/^"(.*)"$/, '$1');
      // Extract <br/><small>tech</small> or <br/>tech
      const parts = inner.split(/<br\s*\/?>/i);
      const label = parts[0].replace(/<[^>]+>/g, '').trim();
      const tech = parts[1] ? parts[1].replace(/<[^>]+>/g, '').trim() : undefined;
      return { id, label: label || id, tech, category };
    }
  }

  const bare = trimmed.match(/^([a-zA-Z0-9_-]+)$/);
  if (bare) {
    return { id: bare[1] };
  }

  return null;
}

export function mermaidToDiagram(
  code: string,
  baseDiagram: ArchitectureDiagram
): ArchitectureDiagram {
  const lines = code.split(/\r?\n/);
  const existingNodesById = new Map<string, ArchitectureNode>();
  for (const n of baseDiagram.nodes) {
    existingNodesById.set(sanitizeMermaidId(n.id), n);
    existingNodesById.set(n.id, n);
  }
  const existingGroupsById = new Map<string, ArchitectureGroup>();
  for (const g of baseDiagram.groups) {
    existingGroupsById.set(sanitizeMermaidId(g.id), g);
    existingGroupsById.set(g.id, g);
  }

  const groups: ArchitectureGroup[] = [];
  const groupSeen = new Set<string>();
  const nodesMap = new Map<string, ArchitectureNode>();
  const edges: ArchitectureEdge[] = [];

  let currentGroupId: string | undefined;

  const ensureNode = (token: string, groupId?: string): string | null => {
    const parsed = parseNodeToken(token);
    if (!parsed) return null;

    const existing = existingNodesById.get(parsed.id);
    const id = existing ? existing.id : parsed.id;
    const prev = nodesMap.get(id);

    const nextNode: ArchitectureNode = {
      id,
      groupId: groupId ?? prev?.groupId ?? existing?.groupId,
      label: parsed.label ?? prev?.label ?? existing?.label ?? id,
      tech: parsed.tech ?? prev?.tech ?? existing?.tech ?? 'Service',
      category:
        prev?.category && !parsed.label
          ? prev.category
          : existing?.category ?? parsed.category ?? 'compute',
      description: prev?.description ?? existing?.description ?? '',
      tier: prev?.tier ?? existing?.tier ?? 2,
    };
    nodesMap.set(id, nextNode);
    return id;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith('%%') ||
      /^flowchart\s+/i.test(line) ||
      /^graph\s+/i.test(line)
    ) {
      continue;
    }

    if (line === 'end') {
      currentGroupId = undefined;
      continue;
    }

    const subMatch = line.match(/^subgraph\s+([a-zA-Z0-9_-]+)(?:\["?([^"\]]+)"?\])?/i);
    if (subMatch) {
      const rawGid = subMatch[1];
      const existingGroup = existingGroupsById.get(rawGid);
      const gid = existingGroup ? existingGroup.id : rawGid;
      const label = subMatch[2]?.trim() || existingGroup?.label || gid;
      if (!groupSeen.has(gid)) {
        groupSeen.add(gid);
        groups.push({
          id: gid,
          label,
          color: existingGroup?.color ?? GROUP_COLORS[groups.length % GROUP_COLORS.length],
        });
      }
      currentGroupId = gid;
      continue;
    }

    // Try matching edges: A -->|"label"| B, A -.->|"label"| B, A ==>|"label"| B, or unlabeled
    const edgeMatch = line.match(
      /^(.+?)\s*(-->|-\.->|==>)\s*(?:\|"([^"]*)"\|\s*|\|\s*([^|]+)\s*\|\s*)?(.+)$/
    );
    if (edgeMatch) {
      const srcId = ensureNode(edgeMatch[1], currentGroupId);
      const tgtId = ensureNode(edgeMatch[5], currentGroupId);
      if (srcId && tgtId && srcId !== tgtId) {
        const arrow = edgeMatch[2];
        const edgeType: EdgeType =
          arrow === '-.->' ? 'async' : arrow === '==>' ? 'data' : 'sync';
        const label = (edgeMatch[3] ?? edgeMatch[4] ?? '').trim();
        edges.push({
          id: `edge-${edges.length + 1}`,
          source: srcId,
          target: tgtId,
          label,
          type: edgeType,
        });
      }
      continue;
    }

    // Standalone node declaration
    ensureNode(line, currentGroupId);
  }

  // Assign topological tiers for newly added nodes that didn't exist before
  const nodes = Array.from(nodesMap.values());
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
      depth.set(n.id, 0);
    }
  }
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const d = depth.get(curr) ?? 0;
    for (const next of adj.get(curr) ?? []) {
      const nextD = Math.min(5, d + 1);
      if ((depth.get(next) ?? -1) < nextD) {
        depth.set(next, nextD);
        queue.push(next);
      }
    }
  }

  for (const n of nodes) {
    if (!existingNodesById.has(n.id) && !existingNodesById.has(sanitizeMermaidId(n.id))) {
      n.tier = depth.get(n.id) ?? 2;
    }
  }

  return {
    ...baseDiagram,
    groups,
    nodes,
    edges,
  };
}
