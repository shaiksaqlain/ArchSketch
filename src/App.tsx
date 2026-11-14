import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArchitectureCanvas } from './components/ArchitectureCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { MermaidPanel } from './components/MermaidPanel';
import { PromptSidebar } from './components/PromptSidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopToolbar } from './components/TopToolbar';
import { DEFAULT_DIAGRAM } from './data/presets';
import {
  ArchitectureDiagram,
  ArchitectureEdge,
  ArchitectureGroup,
  ArchitectureNode,
  ChatMessage,
  DiagramTheme,
  HistorySnapshot,
  NodePosition,
  NodePositionMap,
  ToastItem,
  ToastVariant,
  ViewMode,
} from './types/architecture';
import {
  exportAsJson,
  exportAsMermaid,
  exportAsPng,
  exportAsSvg,
} from './utils/export';
import {
  computeAutoLayout,
  mergeLayoutWithOverrides,
  NODE_HEIGHT,
  NODE_WIDTH,
} from './utils/layout';

const STORAGE_KEY = 'archforge_studio_state_v1';

interface PersistedState {
  diagram: ArchitectureDiagram;
  positions: NodePositionMap;
  messages: ChatMessage[];
  isDark: boolean;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.diagram && Array.isArray(parsed.diagram.nodes)) {
        const positions =
          parsed.positions && typeof parsed.positions === 'object'
            ? mergeLayoutWithOverrides(parsed.diagram, parsed.positions)
            : computeAutoLayout(parsed.diagram);
        return {
          diagram: parsed.diagram,
          positions,
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
          isDark: typeof parsed.isDark === 'boolean' ? parsed.isDark : true,
        };
      }
    }
  } catch {
    // Fallback to clean preset if storage is malformed
  }

  return {
    diagram: DEFAULT_DIAGRAM,
    positions: computeAutoLayout(DEFAULT_DIAGRAM),
    messages: [],
    isDark: true,
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [diagram, setDiagram] = useState<ArchitectureDiagram>(initial.diagram);
  const [positions, setPositions] = useState<NodePositionMap>(initial.positions);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [isDark, setIsDark] = useState<boolean>(initial.isDark);

  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Keep refs to latest state for reliable keyboard shortcuts and undo snapshots
  const diagramRef = useRef(diagram);
  const positionsRef = useRef(positions);
  diagramRef.current = diagram;
  positionsRef.current = positions;

  const notify = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Persist to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        diagram,
        positions,
        messages: messages.slice(-40),
        isDark,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [diagram, positions, messages, isDark]);

  const pushHistory = useCallback(
    (snapshot?: HistorySnapshot) => {
      const snap = snapshot ?? {
        diagram: diagramRef.current,
        positions: positionsRef.current,
      };
      setPast((prev) => [...prev.slice(-29), snap]);
      setFuture([]);
    },
    []
  );

  const commitChange = useCallback(
    (nextDiagram: ArchitectureDiagram, nextPositions?: NodePositionMap) => {
      pushHistory();
      setDiagram(nextDiagram);
      if (nextPositions) {
        setPositions(nextPositions);
      }
    },
    [pushHistory]
  );

  const handleUndo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [
        { diagram: diagramRef.current, positions: positionsRef.current },
        ...f.slice(0, 29),
      ]);
      setDiagram(previous.diagram);
      setPositions(previous.positions);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setPast((p) => [
        ...p.slice(-29),
        { diagram: diagramRef.current, positions: positionsRef.current },
      ]);
      setDiagram(next.diagram);
      setPositions(next.positions);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      return rest;
    });
  }, []);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const curr = diagramRef.current;
      const nextDiagram: ArchitectureDiagram = {
        ...curr,
        nodes: curr.nodes.filter((n) => n.id !== nodeId),
        edges: curr.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      };
      const nextPos = { ...positionsRef.current };
      delete nextPos[nodeId];
      commitChange(nextDiagram, nextPos);
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [commitChange, selectedNodeId]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const curr = diagramRef.current;
      const nextDiagram: ArchitectureDiagram = {
        ...curr,
        edges: curr.edges.filter((e) => e.id !== edgeId),
      };
      commitChange(nextDiagram);
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    },
    [commitChange, selectedEdgeId]
  );

  // Global keyboard shortcuts (Undo/Redo, Delete/Backspace, Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (isEditingText) return;
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        if (isEditingText) return;
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && !isEditingText) {
        if (selectedNodeId) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          handleDeleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteEdge, handleDeleteNode, handleRedo, handleUndo, selectedEdgeId, selectedNodeId]);

  const handleGenerate = async (prompt: string, overrideTheme?: DiagramTheme) => {
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/architecture/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentDiagram: overrideTheme ? undefined : diagram,
          theme: overrideTheme ?? diagram.theme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const nextDiagram = data.diagram as ArchitectureDiagram;
      const nextPositions = overrideTheme
        ? computeAutoLayout(nextDiagram)
        : mergeLayoutWithOverrides(nextDiagram, positions);

      commitChange(nextDiagram, nextPositions);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setFitTrigger((n) => n + 1);

      const assistantMsg: ChatMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        content: nextDiagram.summary,
        timestamp: Date.now(),
        stats: {
          nodes: nextDiagram.nodes.length,
          edges: nextDiagram.edges.length,
          groups: nextDiagram.groups.length,
        },
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorText = err?.message || 'Unable to generate architecture diagram.';
      notify(errorText, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-e-${Date.now()}`,
          role: 'error',
          content: errorText,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddNode = () => {
    const id = `service-${Date.now().toString().slice(-4)}`;
    const newNode: ArchitectureNode = {
      id,
      label: 'New Component',
      tech: 'Service',
      category: 'compute',
      description: 'Custom architecture component.',
      tier: 2,
    };

    // Find non-overlapping spot near tier 2
    const existingList = Object.values(positions);
    let x = 680;
    let y = 160;
    while (
      existingList.some(
        (p) => Math.abs(p.x - x) < NODE_WIDTH * 0.7 && Math.abs(p.y - y) < NODE_HEIGHT * 0.9
      )
    ) {
      y += 124;
    }

    const nextDiagram: ArchitectureDiagram = {
      ...diagram,
      nodes: [...diagram.nodes, newNode],
    };
    const nextPositions: NodePositionMap = {
      ...positions,
      [id]: { x, y },
    };

    commitChange(nextDiagram, nextPositions);
    setSelectedEdgeId(null);
    setSelectedNodeId(id);
  };

  const handleUpdateNode = (id: string, patch: Partial<ArchitectureNode>) => {
    commitChange({
      ...diagram,
      nodes: diagram.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  const handleMoveNode = useCallback((id: string, pos: NodePosition) => {
    setPositions((prev) => ({
      ...prev,
      [id]: pos,
    }));
  }, []);

  const handleCommitPositions = useCallback(
    (snapshotBeforeDrag: NodePositionMap) => {
      pushHistory({ diagram: diagramRef.current, positions: snapshotBeforeDrag });
    },
    [pushHistory]
  );

  const handleConnectNodes = useCallback(
    (sourceId: string, targetId: string) => {
      const curr = diagramRef.current;
      const newEdge: ArchitectureEdge = {
        id: `edge-${Date.now().toString().slice(-5)}`,
        source: sourceId,
        target: targetId,
        label: 'HTTPS',
        type: 'sync',
      };
      commitChange({
        ...curr,
        edges: [...curr.edges, newEdge],
      });
      setSelectedNodeId(null);
      setSelectedEdgeId(newEdge.id);
    },
    [commitChange]
  );

  const handleUpdateEdge = (id: string, patch: Partial<ArchitectureEdge>) => {
    commitChange({
      ...diagram,
      edges: diagram.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const handleAddGroup = (group: ArchitectureGroup) => {
    commitChange({
      ...diagram,
      groups: [...diagram.groups, group],
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    commitChange({
      ...diagram,
      groups: diagram.groups.filter((g) => g.id !== groupId),
      nodes: diagram.nodes.map((n) =>
        n.groupId === groupId ? { ...n, groupId: undefined } : n
      ),
    });
  };

  const handleAutoLayout = () => {
    const nextPositions = computeAutoLayout(diagram);
    commitChange(diagram, nextPositions);
    setFitTrigger((n) => n + 1);
    notify('Recomputed smart tier auto-layout.', 'info');
  };

  const handleApplyMermaid = (nextDiagram: ArchitectureDiagram) => {
    const nextPositions = mergeLayoutWithOverrides(nextDiagram, positions);
    commitChange(nextDiagram, nextPositions);
    setFitTrigger((n) => n + 1);
  };

  const handleResetDefault = () => {
    const defaultPos = computeAutoLayout(DEFAULT_DIAGRAM);
    commitChange(DEFAULT_DIAGRAM, defaultPos);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setFitTrigger((n) => n + 1);
    notify('Loaded default order & payment architecture.', 'info');
  };

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      await exportAsPng(diagram, positions, isDark);
      notify('Exported high-resolution PNG diagram.', 'success');
    } catch (err: any) {
      notify(err?.message || 'PNG export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = () => {
    exportAsSvg(diagram, positions, isDark);
    notify('Exported vector SVG diagram.', 'success');
  };

  const handleExportMermaid = () => {
    exportAsMermaid(diagram);
    notify('Downloaded Mermaid (.mmd) file.', 'success');
  };

  const handleExportJson = () => {
    exportAsJson(diagram);
    notify('Downloaded diagram JSON schema.', 'success');
  };

  const selectedNode = useMemo(
    () => diagram.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [diagram.nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => diagram.edges.find((e) => e.id === selectedEdgeId) ?? null,
    [diagram.edges, selectedEdgeId]
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopToolbar
        title={diagram.title}
        onTitleChange={(title) => setDiagram((prev) => ({ ...prev, title }))}
        theme={diagram.theme}
        onThemeChange={(theme) => commitChange({ ...diagram, theme })}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddNode={handleAddNode}
        onAutoLayout={handleAutoLayout}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportMermaid={handleExportMermaid}
        onExportJson={handleExportJson}
        isExporting={isExporting}
      />

      <main className="flex-1 min-h-0 flex overflow-hidden">
        {sidebarOpen && (
          <PromptSidebar
            messages={messages}
            isGenerating={isGenerating}
            activeTheme={diagram.theme}
            onGenerate={handleGenerate}
            onClearHistory={() => setMessages([])}
            onResetDefault={handleResetDefault}
          />
        )}

        {/* Center Workspace Viewport */}
        <section className="flex-1 min-w-0 flex overflow-hidden">
          {viewMode === 'canvas' && (
            <ArchitectureCanvas
              diagram={diagram}
              positions={positions}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              isDark={isDark}
              onSelectNode={setSelectedNodeId}
              onSelectEdge={setSelectedEdgeId}
              onMoveNode={handleMoveNode}
              onCommitPositions={handleCommitPositions}
              onConnectNodes={handleConnectNodes}
              fitTrigger={fitTrigger}
            />
          )}

          {viewMode === 'split' && (
            <>
              <div className="flex-1 min-w-0 flex">
                <ArchitectureCanvas
                  diagram={diagram}
                  positions={positions}
                  selectedNodeId={selectedNodeId}
                  selectedEdgeId={selectedEdgeId}
                  isDark={isDark}
                  onSelectNode={setSelectedNodeId}
                  onSelectEdge={setSelectedEdgeId}
                  onMoveNode={handleMoveNode}
                  onCommitPositions={handleCommitPositions}
                  onConnectNodes={handleConnectNodes}
                  fitTrigger={fitTrigger}
                />
              </div>
              <div className="w-[42%] max-w-[540px] min-w-[320px] flex">
                <MermaidPanel
                  diagram={diagram}
                  isDark={isDark}
                  onApplyMermaid={handleApplyMermaid}
                  onNotify={notify}
                />
              </div>
            </>
          )}

          {viewMode === 'mermaid' && (
            <div className="flex-1 min-w-0 flex">
              <MermaidPanel
                diagram={diagram}
                isDark={isDark}
                onApplyMermaid={handleApplyMermaid}
                onNotify={notify}
              />
            </div>
          )}
        </section>

        {/* Right Contextual Inspector */}
        <InspectorPanel
          diagram={diagram}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onUpdateEdge={handleUpdateEdge}
          onDeleteEdge={handleDeleteEdge}
          onAddGroup={handleAddGroup}
          onDeleteGroup={handleDeleteGroup}
          onSelectNode={(id) => {
            setSelectedEdgeId(null);
            setSelectedNodeId(id);
          }}
          onAddNode={handleAddNode}
          onCloseSelection={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
        />
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
