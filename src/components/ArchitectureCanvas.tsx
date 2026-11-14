import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import {
  ArchitectureDiagram,
  ArchitectureNode,
  NodePosition,
  NodePositionMap,
} from '../types/architecture';
import {
  CATEGORY_META,
  CategoryIcon,
  GROUP_COLOR_CLASSES,
} from '../utils/categoryMeta';
import {
  computeEdgeGeometry,
  computeGroupBounds,
  NODE_HEIGHT,
  NODE_WIDTH,
} from '../utils/layout';

interface ArchitectureCanvasProps {
  diagram: ArchitectureDiagram;
  positions: NodePositionMap;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDark: boolean;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onMoveNode: (id: string, pos: NodePosition) => void;
  onCommitPositions: (nextPositions: NodePositionMap) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  fitTrigger: number;
}

interface ConnectingState {
  sourceId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  diagram,
  positions,
  selectedNodeId,
  selectedEdgeId,
  isDark,
  onSelectNode,
  onSelectEdge,
  onMoveNode,
  onCommitPositions,
  onConnectNodes,
  fitTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 32, y: 32 });
  const [zoom, setZoom] = useState(0.92);

  // Dragging refs so pointermove stays smooth at 60fps
  const panStateRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);

  const nodeDragRef = useRef<{
    nodeId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    moved: boolean;
    snapshotBeforeDrag: NodePositionMap;
  } | null>(null);

  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const groups = useMemo(
    () => computeGroupBounds(diagram, positions),
    [diagram, positions]
  );

  // Convert screen client coordinates to world canvas coordinates
  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el || diagram.nodes.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of diagram.nodes) {
      const p = positions[node.id];
      if (!p) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_WIDTH);
      maxY = Math.max(maxY, p.y + NODE_HEIGHT);
    }

    for (const g of groups) {
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.width);
      maxY = Math.max(maxY, g.y + g.height);
    }

    if (!Number.isFinite(minX)) return;

    const rect = el.getBoundingClientRect();
    const pad = 64;
    const contentW = Math.max(100, maxX - minX);
    const contentH = Math.max(100, maxY - minY);
    const nextZoom = Math.max(
      0.35,
      Math.min(1.15, Math.min((rect.width - pad * 2) / contentW, (rect.height - pad * 2) / contentH))
    );

    const nextPanX = (rect.width - contentW * nextZoom) / 2 - minX * nextZoom;
    const nextPanY = (rect.height - contentH * nextZoom) / 2 - minY * nextZoom;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }, [diagram.nodes, groups, positions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 40);
    return () => clearTimeout(timer);
    // Re-fit only when fitTrigger increments (initial load, new generation, auto-layout, manual Fit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTrigger]);

  // Global window pointer move/up handlers for smooth dragging and connecting
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (panStateRef.current?.active) {
        const ps = panStateRef.current;
        setPan({
          x: ps.origPanX + (e.clientX - ps.startClientX),
          y: ps.origPanY + (e.clientY - ps.startClientY),
        });
        return;
      }

      if (nodeDragRef.current) {
        const nd = nodeDragRef.current;
        const dx = (e.clientX - nd.startClientX) / zoom;
        const dy = (e.clientY - nd.startClientY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          nd.moved = true;
        }
        onMoveNode(nd.nodeId, {
          x: Math.round(nd.origX + dx),
          y: Math.round(nd.origY + dy),
        });
        return;
      }

      if (connecting) {
        const world = clientToWorld(e.clientX, e.clientY);
        setConnecting((prev) =>
          prev ? { ...prev, currentX: world.x, currentY: world.y } : null
        );
      }
    };

    const handlePointerUp = () => {
      if (panStateRef.current?.active) {
        panStateRef.current = null;
      }

      if (nodeDragRef.current) {
        const nd = nodeDragRef.current;
        nodeDragRef.current = null;
        if (nd.moved) {
          onCommitPositions(nd.snapshotBeforeDrag);
        }
      }

      if (connecting) {
        if (hoveredTargetId && hoveredTargetId !== connecting.sourceId) {
          onConnectNodes(connecting.sourceId, hoveredTargetId);
        }
        setConnecting(null);
        setHoveredTargetId(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    clientToWorld,
    connecting,
    hoveredTargetId,
    onCommitPositions,
    onConnectNodes,
    onMoveNode,
    zoom,
  ]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    const nextZoom = Math.max(0.25, Math.min(2.2, zoom * factor));
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const worldX = (cursorX - pan.x) / zoom;
    const worldY = (cursorY - pan.y) / zoom;

    setZoom(nextZoom);
    setPan({
      x: cursorX - worldX * nextZoom,
      y: cursorY - worldY * nextZoom,
    });
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    onSelectNode(null);
    onSelectEdge(null);
    panStateRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
    };
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: ArchitectureNode
  ) => {
    e.stopPropagation();
    onSelectEdge(null);
    onSelectNode(node.id);
    const pos = positions[node.id] ?? { x: 0, y: 0 };
    nodeDragRef.current = {
      nodeId: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
      snapshotBeforeDrag: { ...positions },
    };
  };

  const handleHandlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    node: ArchitectureNode,
    side: 'right' | 'left'
  ) => {
    e.stopPropagation();
    const pos = positions[node.id] ?? { x: 0, y: 0 };
    const startX = side === 'right' ? pos.x + NODE_WIDTH : pos.x;
    const startY = pos.y + NODE_HEIGHT / 2;
    setConnecting({
      sourceId: node.id,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  };

  const adjustZoom = (delta: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextZoom = Math.max(0.25, Math.min(2.2, zoom + delta));
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const wx = (cx - pan.x) / zoom;
    const wy = (cy - pan.y) / zoom;
    setZoom(nextZoom);
    setPan({ x: cx - wx * nextZoom, y: cy - wy * nextZoom });
  };

  // Compute parallel edge offsets if multiple edges share the same source/target pair
  const edgeGeometries = useMemo(() => {
    const pairCount = new Map<string, number>();
    return diagram.edges.map((edge) => {
      const src = positions[edge.source];
      const tgt = positions[edge.target];
      if (!src || !tgt) return null;
      const key = [edge.source, edge.target].sort().join('::');
      const idx = pairCount.get(key) ?? 0;
      pairCount.set(key, idx + 1);
      const offset = idx === 0 ? 0 : idx % 2 === 1 ? Math.ceil(idx / 2) : -Math.ceil(idx / 2);
      return {
        edge,
        geom: computeEdgeGeometry(src, tgt, offset),
      };
    });
  }, [diagram.edges, positions]);

  const gridSize = 24 * zoom;
  const dotColor = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.22)';

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handleBackgroundPointerDown}
      className="relative flex-1 h-full overflow-hidden bg-slate-50 dark:bg-slate-950 select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Transformed World Layer */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        }}
      >
        {/* Group Bounding Containers */}
        {groups.map((g) => {
          const style = GROUP_COLOR_CLASSES[g.color] ?? GROUP_COLOR_CLASSES.slate;
          return (
            <div
              key={g.id}
              style={{
                left: g.x,
                top: g.y,
                width: g.width,
                height: g.height,
              }}
              className={`absolute rounded-xl border border-dashed ${style.container} transition-colors`}
            >
              <div className={`px-3.5 pt-2.5 text-xs font-display font-semibold tracking-tight ${style.label}`}>
                {g.label}
              </div>
            </div>
          );
        })}

        {/* SVG Edge Layer */}
        <svg
          className="absolute inset-0 overflow-visible pointer-events-none"
          width="1"
          height="1"
        >
          <defs>
            <marker
              id="canvas-arrow-sync"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={isDark ? '#60a5fa' : '#2563eb'} />
            </marker>
            <marker
              id="canvas-arrow-async"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={isDark ? '#f59e0b' : '#d97706'} />
            </marker>
            <marker
              id="canvas-arrow-data"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={isDark ? '#10b981' : '#059669'} />
            </marker>
            <marker
              id="canvas-arrow-selected"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#f43f5e" />
            </marker>
          </defs>

          {edgeGeometries.map((item) => {
            if (!item) return null;
            const { edge, geom } = item;
            const isSelected = selectedEdgeId === edge.id;
            const stroke = isSelected
              ? '#f43f5e'
              : edge.type === 'async'
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

            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer">
                {/* Invisible wider hit path */}
                <path
                  d={geom.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectNode(null);
                    onSelectEdge(edge.id);
                  }}
                />
                <path
                  d={geom.path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isSelected ? 2.6 : edge.type === 'data' ? 2.2 : 1.75}
                  strokeDasharray={edge.type === 'async' ? '6 4' : undefined}
                  markerEnd={
                    isSelected
                      ? 'url(#canvas-arrow-selected)'
                      : `url(#canvas-arrow-${edge.type})`
                  }
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectNode(null);
                    onSelectEdge(edge.id);
                  }}
                />
              </g>
            );
          })}

          {/* Live Drag-to-Connect Preview Wire */}
          {connecting && (
            <path
              d={`M ${connecting.startX} ${connecting.startY} C ${connecting.startX + 60} ${connecting.startY}, ${connecting.currentX - 60} ${connecting.currentY}, ${connecting.currentX} ${connecting.currentY}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}
        </svg>

        {/* Edge Labels (HTML layer for crisp text rendering) */}
        {edgeGeometries.map((item) => {
          if (!item || !item.edge.label) return null;
          const { edge, geom } = item;
          const isSelected = selectedEdgeId === edge.id;
          return (
            <button
              key={`lbl-${edge.id}`}
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectNode(null);
                onSelectEdge(edge.id);
              }}
              style={{
                left: geom.labelX,
                top: geom.labelY,
                transform: 'translate(-50%, -50%)',
              }}
              className={`pointer-events-auto absolute px-2 py-0.5 rounded-md text-[11px] font-mono whitespace-nowrap border transition-colors ${
                isSelected
                  ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-400 text-rose-700 dark:text-rose-200 shadow-sm'
                  : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              {edge.label}
            </button>
          );
        })}

        {/* Node Cards */}
        {diagram.nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const meta = CATEGORY_META[node.category] ?? CATEGORY_META.compute;
          const isSelected = selectedNodeId === node.id;
          const isDropTarget =
            connecting &&
            connecting.sourceId !== node.id &&
            hoveredTargetId === node.id;

          return (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onPointerEnter={() => {
                if (connecting && connecting.sourceId !== node.id) {
                  setHoveredTargetId(node.id);
                }
              }}
              onPointerLeave={() => {
                if (hoveredTargetId === node.id) {
                  setHoveredTargetId(null);
                }
              }}
              style={{
                left: pos.x,
                top: pos.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
              className={`pointer-events-auto group absolute rounded-[10px] bg-white dark:bg-slate-900 border transition-shadow cursor-move flex flex-col justify-between ${
                isDropTarget
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg'
                  : isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              {/* Top Category Accent Strip */}
              <div className={`h-1 w-full rounded-t-[9px] ${meta.topBarClass}`} />

              <div className="px-3.5 py-2.5 flex-1 flex flex-col justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${meta.iconBgClass} ${meta.iconTextClass}`}
                  >
                    <CategoryIcon category={node.category} className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {meta.label}
                  </span>
                </div>

                <div className="min-w-0 mt-1">
                  <div className="font-display font-semibold text-[13.5px] leading-tight text-slate-900 dark:text-slate-100 truncate">
                    {node.label}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {node.tech}
                  </div>
                </div>
              </div>

              {/* Left Input Port */}
              <button
                type="button"
                aria-label={`Connect from ${node.label} left handle`}
                onPointerDown={(e) => handleHandlePointerDown(e, node, 'left')}
                className={`absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 transition-opacity cursor-crosshair ${
                  isSelected || connecting
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              />

              {/* Right Output Port */}
              <button
                type="button"
                aria-label={`Connect from ${node.label} right handle`}
                onPointerDown={(e) => handleHandlePointerDown(e, node, 'right')}
                className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 transition-opacity cursor-crosshair ${
                  isSelected || connecting
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Empty Canvas State */}
      {diagram.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm px-6 py-5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
              Canvas is empty
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Use the AI Architect panel to generate a system architecture or click Add Node in the toolbar.
            </p>
          </div>
        </div>
      )}

      {/* Floating Bottom-Left Zoom Controls */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-4 flex items-center gap-1 p-1 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-xs"
      >
        <button
          type="button"
          onClick={() => adjustZoom(-0.15)}
          title="Zoom out"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          title="Reset zoom to 100%"
          className="px-2 py-1 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(0.15)}
          title="Zoom in"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
        <button
          type="button"
          onClick={fitToView}
          title="Fit diagram to viewport"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </button>
      </div>

      {/* Floating Bottom-Right Edge Legend & Graph Stats */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="hidden md:flex absolute bottom-4 right-4 items-center gap-3 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm text-[11px] text-slate-500 dark:text-slate-400 backdrop-blur-xs"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-blue-500 inline-block" />
          <span>Sync</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 border-t-2 border-dashed border-amber-500 inline-block" />
          <span>Async</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-emerald-500 inline-block" />
          <span>Data</span>
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="font-mono tabular-nums">
          {diagram.nodes.length} nodes · {diagram.edges.length} edges
        </span>
      </div>
    </div>
  );
};
