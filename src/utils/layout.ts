import {
  ArchitectureDiagram,
  GroupBounds,
  NodePosition,
  NodePositionMap,
} from '../types/architecture';

export const NODE_WIDTH = 228;
export const NODE_HEIGHT = 96;
export const TIER_SPACING = 300;
export const ROW_SPACING = 136;
export const START_X = 80;
export const START_Y = 80;
export const GROUP_PAD_X = 28;
export const GROUP_PAD_TOP = 46;
export const GROUP_PAD_BOTTOM = 26;

export function computeAutoLayout(diagram: ArchitectureDiagram): NodePositionMap {
  const positions: NodePositionMap = {};
  if (diagram.nodes.length === 0) return positions;

  const groupOrder = new Map<string, number>();
  diagram.groups.forEach((g, idx) => groupOrder.set(g.id, idx));

  const tierMap = new Map<number, typeof diagram.nodes>();
  for (const node of diagram.nodes) {
    const t = Number.isFinite(node.tier) ? node.tier : 0;
    const list = tierMap.get(t) ?? [];
    list.push(node);
    tierMap.set(t, list);
  }

  const sortedTiers = Array.from(tierMap.keys()).sort((a, b) => a - b);
  let maxRows = 1;
  for (const t of sortedTiers) {
    maxRows = Math.max(maxRows, tierMap.get(t)!.length);
  }

  const totalHeight = (maxRows - 1) * ROW_SPACING + NODE_HEIGHT;

  sortedTiers.forEach((tier, colIdx) => {
    const columnNodes = [...tierMap.get(tier)!];
    // Cluster nodes sharing the same groupId together so group containers wrap cleanly
    columnNodes.sort((a, b) => {
      const ga = a.groupId ? (groupOrder.get(a.groupId) ?? 999) : 1000;
      const gb = b.groupId ? (groupOrder.get(b.groupId) ?? 999) : 1000;
      if (ga !== gb) return ga - gb;
      return a.label.localeCompare(b.label);
    });

    const colHeight = (columnNodes.length - 1) * ROW_SPACING + NODE_HEIGHT;
    const yOffset = START_Y + Math.max(0, (totalHeight - colHeight) / 2);
    const x = START_X + colIdx * TIER_SPACING;

    columnNodes.forEach((node, rowIdx) => {
      positions[node.id] = {
        x: Math.round(x),
        y: Math.round(yOffset + rowIdx * ROW_SPACING),
      };
    });
  });

  return positions;
}

export function mergeLayoutWithOverrides(
  diagram: ArchitectureDiagram,
  existingPositions: NodePositionMap
): NodePositionMap {
  const auto = computeAutoLayout(diagram);
  const merged: NodePositionMap = {};

  // Track occupied slots per tier to prevent newly added nodes from landing on dragged nodes
  const occupied: NodePosition[] = [];
  for (const node of diagram.nodes) {
    const prev = existingPositions[node.id];
    if (prev && Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
      merged[node.id] = prev;
      occupied.push(prev);
    }
  }

  for (const node of diagram.nodes) {
    if (merged[node.id]) continue;
    let candidate = { ...auto[node.id] };
    // Nudge downward if colliding with an already placed node
    let guard = 0;
    while (
      guard < 12 &&
      occupied.some(
        (p) =>
          Math.abs(p.x - candidate.x) < NODE_WIDTH * 0.8 &&
          Math.abs(p.y - candidate.y) < NODE_HEIGHT * 0.9
      )
    ) {
      candidate = { x: candidate.x, y: candidate.y + ROW_SPACING };
      guard++;
    }
    merged[node.id] = candidate;
    occupied.push(candidate);
  }

  return merged;
}

export function computeGroupBounds(
  diagram: ArchitectureDiagram,
  positions: NodePositionMap
): GroupBounds[] {
  const bounds: GroupBounds[] = [];

  for (const group of diagram.groups) {
    const members = diagram.nodes.filter((n) => n.groupId === group.id && positions[n.id]);
    if (members.length === 0) continue;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of members) {
      const pos = positions[node.id];
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    }

    bounds.push({
      id: group.id,
      label: group.label,
      color: group.color,
      x: minX - GROUP_PAD_X,
      y: minY - GROUP_PAD_TOP,
      width: maxX - minX + GROUP_PAD_X * 2,
      height: maxY - minY + GROUP_PAD_TOP + GROUP_PAD_BOTTOM,
    });
  }

  return bounds;
}

export interface EdgeGeometry {
  path: string;
  labelX: number;
  labelY: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

export function computeEdgeGeometry(
  sourcePos: NodePosition,
  targetPos: NodePosition,
  edgeIndexOffset = 0
): EdgeGeometry {
  const sourceCx = sourcePos.x + NODE_WIDTH / 2;
  const sourceCy = sourcePos.y + NODE_HEIGHT / 2;
  const targetCx = targetPos.x + NODE_WIDTH / 2;
  const targetCy = targetPos.y + NODE_HEIGHT / 2;

  const dx = targetCx - sourceCx;
  const dy = targetCy - sourceCy;

  let sx: number;
  let sy: number;
  let tx: number;
  let ty: number;
  let path: string;

  // Same-column vertical stacking connection
  if (Math.abs(dx) < NODE_WIDTH * 0.55) {
    if (dy >= 0) {
      sx = sourceCx + edgeIndexOffset * 12;
      sy = sourcePos.y + NODE_HEIGHT;
      tx = targetCx + edgeIndexOffset * 12;
      ty = targetPos.y;
      const cpOffset = Math.max(40, Math.abs(ty - sy) * 0.45);
      path = `M ${sx} ${sy} C ${sx} ${sy + cpOffset}, ${tx} ${ty - cpOffset}, ${tx} ${ty}`;
    } else {
      sx = sourceCx + edgeIndexOffset * 12;
      sy = sourcePos.y;
      tx = targetCx + edgeIndexOffset * 12;
      ty = targetPos.y + NODE_HEIGHT;
      const cpOffset = Math.max(40, Math.abs(ty - sy) * 0.45);
      path = `M ${sx} ${sy} C ${sx} ${sy - cpOffset}, ${tx} ${ty + cpOffset}, ${tx} ${ty}`;
    }
  } else if (dx >= 0) {
    // Left-to-right flow
    sx = sourcePos.x + NODE_WIDTH;
    sy = sourceCy + edgeIndexOffset * 14;
    tx = targetPos.x;
    ty = targetCy + edgeIndexOffset * 14;
    const dist = Math.max(54, Math.abs(tx - sx) * 0.46);
    path = `M ${sx} ${sy} C ${sx + dist} ${sy}, ${tx - dist} ${ty}, ${tx} ${ty}`;
  } else {
    // Right-to-left feedback loop
    sx = sourcePos.x;
    sy = sourceCy + edgeIndexOffset * 14;
    tx = targetPos.x + NODE_WIDTH;
    ty = targetCy + edgeIndexOffset * 14;
    const dist = Math.max(64, Math.abs(sx - tx) * 0.46);
    path = `M ${sx} ${sy} C ${sx - dist} ${sy}, ${tx + dist} ${ty}, ${tx} ${ty}`;
  }

  return {
    path,
    labelX: (sx + tx) / 2,
    labelY: (sy + ty) / 2,
    sx,
    sy,
    tx,
    ty,
  };
}
