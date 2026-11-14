import React, { useState } from 'react';
import {
  ArrowRight,
  FolderPlus,
  Layers,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  ArchitectureDiagram,
  ArchitectureEdge,
  ArchitectureGroup,
  ArchitectureNode,
  EdgeType,
  GroupColor,
  NodeCategory,
} from '../types/architecture';
import {
  CATEGORY_META,
  CategoryIcon,
  TIER_LABELS,
} from '../utils/categoryMeta';

interface InspectorPanelProps {
  diagram: ArchitectureDiagram;
  selectedNode: ArchitectureNode | null;
  selectedEdge: ArchitectureEdge | null;
  onUpdateNode: (id: string, patch: Partial<ArchitectureNode>) => void;
  onDeleteNode: (id: string) => void;
  onUpdateEdge: (id: string, patch: Partial<ArchitectureEdge>) => void;
  onDeleteEdge: (id: string) => void;
  onAddGroup: (group: ArchitectureGroup) => void;
  onDeleteGroup: (id: string) => void;
  onSelectNode: (id: string | null) => void;
  onAddNode: () => void;
  onCloseSelection: () => void;
}

const CATEGORIES = Object.keys(CATEGORY_META) as NodeCategory[];
const GROUP_COLORS: GroupColor[] = ['blue', 'purple', 'emerald', 'amber', 'slate'];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  diagram,
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onAddGroup,
  onDeleteGroup,
  onSelectNode,
  onAddNode,
  onCloseSelection,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<GroupColor>('blue');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newGroupName.trim();
    if (!label) return;
    const id =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `group-${Date.now()}`;
    onAddGroup({ id: `${id}-${Date.now().toString().slice(-3)}`, label, color: newGroupColor });
    setNewGroupName('');
  };

  if (selectedNode) {
    return (
      <aside className="w-76 lg:w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Node Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={onCloseSelection}
            aria-label="Close node inspector"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Component Label
            </label>
            <input
              type="text"
              value={selectedNode.label}
              onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Technology / Runtime
            </label>
            <input
              type="text"
              value={selectedNode.tech}
              onChange={(e) => onUpdateNode(selectedNode.id, { tech: e.target.value })}
              className="w-full px-3 py-1.5 text-sm font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Category Icon
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = selectedNode.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onUpdateNode(selectedNode.id, { category: cat })}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <CategoryIcon category={cat} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Column Tier
              </label>
              <select
                value={selectedNode.tier}
                onChange={(e) => onUpdateNode(selectedNode.id, { tier: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[0, 1, 2, 3, 4, 5].map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABELS[t] ?? `Tier ${t}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Group Container
              </label>
              <select
                value={selectedNode.groupId ?? ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    groupId: e.target.value || undefined,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Ungrouped</option>
                {diagram.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Responsibility Description
            </label>
            <textarea
              rows={3}
              value={selectedNode.description}
              onChange={(e) => onUpdateNode(selectedNode.id, { description: e.target.value })}
              className="w-full resize-none px-3 py-2 text-xs leading-relaxed rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>ID: {selectedNode.id}</span>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onDeleteNode(selectedNode.id)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-medium text-rose-700 dark:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Component</span>
          </button>
        </div>
      </aside>
    );
  }

  if (selectedEdge) {
    const sourceNode = diagram.nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = diagram.nodes.find((n) => n.id === selectedEdge.target);

    return (
      <aside className="w-76 lg:w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Connection Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={onCloseSelection}
            aria-label="Close edge inspector"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <span className="font-medium truncate">{sourceNode?.label ?? selectedEdge.source}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium truncate">{targetNode?.label ?? selectedEdge.target}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Protocol / Flow Label
            </label>
            <input
              type="text"
              value={selectedEdge.label}
              onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
              placeholder="e.g., gRPC, Kafka Event, SQL"
              className="w-full px-3 py-1.5 text-sm font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Connection Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['sync', 'async', 'data'] as EdgeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdateEdge(selectedEdge.id, { type: t })}
                  className={`py-1.5 px-2 rounded-md border text-xs font-medium capitalize transition-colors ${
                    selectedEdge.type === t
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onDeleteEdge(selectedEdge.id)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-medium text-rose-700 dark:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Connection</span>
          </button>
        </div>
      </aside>
    );
  }

  // Default Diagram Overview Inspector
  return (
    <aside className="hidden xl:flex w-76 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Architecture Outline
          </h2>
        </div>
        <button
          type="button"
          onClick={onAddNode}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Node</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Summary</p>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {diagram.summary}
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            {diagram.nodes.length} components · {diagram.edges.length} connections ·{' '}
            {diagram.groups.length} groups
          </div>
        </div>

        {/* Groups Management */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Boundary Groups
          </p>
          <div className="space-y-1.5 mb-2.5">
            {diagram.groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs"
              >
                <span className="text-slate-800 dark:text-slate-200 truncate">{g.label}</span>
                <button
                  type="button"
                  onClick={() => onDeleteGroup(g.id)}
                  aria-label={`Delete group ${g.label}`}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateGroup} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group label..."
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value as GroupColor)}
              aria-label="New group color"
              className="px-1.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200"
            >
              {GROUP_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Add boundary group"
              className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Components Quick List */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Components ({diagram.nodes.length})
          </p>
          <div className="space-y-1">
            {diagram.nodes.map((node) => {
              const meta = CATEGORY_META[node.category] ?? CATEGORY_META.compute;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <span className={meta.iconTextClass}>
                    <CategoryIcon category={node.category} className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {node.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    T{node.tier}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
