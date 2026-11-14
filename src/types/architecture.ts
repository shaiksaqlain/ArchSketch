export type DiagramTheme = 'generic' | 'aws' | 'gcp' | 'azure' | 'kubernetes';

export type GroupColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';

export type NodeCategory =
  | 'client'
  | 'network'
  | 'compute'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'ai'
  | 'security';

export type EdgeType = 'sync' | 'async' | 'data';

export interface ArchitectureGroup {
  id: string;
  label: string;
  color: GroupColor;
}

export interface ArchitectureNode {
  id: string;
  groupId?: string;
  label: string;
  tech: string;
  category: NodeCategory;
  description: string;
  tier: number;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: EdgeType;
}

export interface ArchitectureDiagram {
  title: string;
  theme: DiagramTheme;
  summary: string;
  groups: ArchitectureGroup[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface NodePosition {
  x: number;
  y: number;
}

export type NodePositionMap = Record<string, NodePosition>;

export interface GroupBounds {
  id: string;
  label: string;
  color: GroupColor;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ViewMode = 'canvas' | 'split' | 'mermaid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: number;
  stats?: {
    nodes: number;
    edges: number;
    groups: number;
  };
}

export interface HistorySnapshot {
  diagram: ArchitectureDiagram;
  positions: NodePositionMap;
}

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}
