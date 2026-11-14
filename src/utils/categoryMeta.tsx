import React from 'react';
import {
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DiagramTheme, GroupColor, NodeCategory } from '../types/architecture';

export interface CategoryMeta {
  id: NodeCategory;
  label: string;
  accentHex: string;
  iconBgClass: string;
  iconTextClass: string;
  topBarClass: string;
}

export const CATEGORY_META: Record<NodeCategory, CategoryMeta> = {
  client: {
    id: 'client',
    label: 'Client',
    accentHex: '#0ea5e9',
    iconBgClass: 'bg-sky-500/12 dark:bg-sky-500/15',
    iconTextClass: 'text-sky-600 dark:text-sky-400',
    topBarClass: 'bg-sky-500',
  },
  network: {
    id: 'network',
    label: 'Network',
    accentHex: '#6366f1',
    iconBgClass: 'bg-indigo-500/12 dark:bg-indigo-500/15',
    iconTextClass: 'text-indigo-600 dark:text-indigo-400',
    topBarClass: 'bg-indigo-500',
  },
  compute: {
    id: 'compute',
    label: 'Compute',
    accentHex: '#3b82f6',
    iconBgClass: 'bg-blue-500/12 dark:bg-blue-500/15',
    iconTextClass: 'text-blue-600 dark:text-blue-400',
    topBarClass: 'bg-blue-500',
  },
  database: {
    id: 'database',
    label: 'Database',
    accentHex: '#10b981',
    iconBgClass: 'bg-emerald-500/12 dark:bg-emerald-500/15',
    iconTextClass: 'text-emerald-600 dark:text-emerald-400',
    topBarClass: 'bg-emerald-500',
  },
  cache: {
    id: 'cache',
    label: 'Cache',
    accentHex: '#f59e0b',
    iconBgClass: 'bg-amber-500/12 dark:bg-amber-500/15',
    iconTextClass: 'text-amber-600 dark:text-amber-400',
    topBarClass: 'bg-amber-500',
  },
  queue: {
    id: 'queue',
    label: 'Queue',
    accentHex: '#ec4899',
    iconBgClass: 'bg-pink-500/12 dark:bg-pink-500/15',
    iconTextClass: 'text-pink-600 dark:text-pink-400',
    topBarClass: 'bg-pink-500',
  },
  storage: {
    id: 'storage',
    label: 'Storage',
    accentHex: '#14b8a6',
    iconBgClass: 'bg-teal-500/12 dark:bg-teal-500/15',
    iconTextClass: 'text-teal-600 dark:text-teal-400',
    topBarClass: 'bg-teal-500',
  },
  ai: {
    id: 'ai',
    label: 'AI / ML',
    accentHex: '#a855f7',
    iconBgClass: 'bg-purple-500/12 dark:bg-purple-500/15',
    iconTextClass: 'text-purple-600 dark:text-purple-400',
    topBarClass: 'bg-purple-500',
  },
  security: {
    id: 'security',
    label: 'Security',
    accentHex: '#ef4444',
    iconBgClass: 'bg-rose-500/12 dark:bg-rose-500/15',
    iconTextClass: 'text-rose-600 dark:text-rose-400',
    topBarClass: 'bg-rose-500',
  },
};

export function CategoryIcon({
  category,
  className = 'w-4 h-4',
}: {
  category: NodeCategory;
  className?: string;
}) {
  switch (category) {
    case 'client':
      return <MonitorSmartphone className={className} />;
    case 'network':
      return <Globe className={className} />;
    case 'compute':
      return <Cpu className={className} />;
    case 'database':
      return <Database className={className} />;
    case 'cache':
      return <Zap className={className} />;
    case 'queue':
      return <Layers className={className} />;
    case 'storage':
      return <HardDrive className={className} />;
    case 'ai':
      return <Sparkles className={className} />;
    case 'security':
      return <ShieldCheck className={className} />;
    default:
      return <Cpu className={className} />;
  }
}

export const GROUP_COLOR_CLASSES: Record<
  GroupColor,
  { container: string; label: string }
> = {
  blue: {
    container:
      'bg-blue-50/70 border-blue-300/80 dark:bg-blue-950/20 dark:border-blue-500/40',
    label: 'text-blue-700 dark:text-blue-400',
  },
  purple: {
    container:
      'bg-purple-50/70 border-purple-300/80 dark:bg-purple-950/20 dark:border-purple-500/40',
    label: 'text-purple-700 dark:text-purple-400',
  },
  emerald: {
    container:
      'bg-emerald-50/70 border-emerald-300/80 dark:bg-emerald-950/20 dark:border-emerald-500/40',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  amber: {
    container:
      'bg-amber-50/70 border-amber-300/80 dark:bg-amber-950/20 dark:border-amber-500/40',
    label: 'text-amber-700 dark:text-amber-400',
  },
  slate: {
    container:
      'bg-slate-100/70 border-slate-300/90 dark:bg-slate-900/40 dark:border-slate-700/80',
    label: 'text-slate-600 dark:text-slate-400',
  },
};

export const THEME_OPTIONS: Array<{ id: DiagramTheme; label: string }> = [
  { id: 'generic', label: 'Generic' },
  { id: 'aws', label: 'AWS' },
  { id: 'gcp', label: 'GCP' },
  { id: 'azure', label: 'Azure' },
  { id: 'kubernetes', label: 'Kubernetes' },
];

export const TIER_LABELS: Record<number, string> = {
  0: 'Tier 0 — Clients',
  1: 'Tier 1 — Edge & Gateway',
  2: 'Tier 2 — Compute & Services',
  3: 'Tier 3 — Messaging & Cache',
  4: 'Tier 4 — Storage & Data',
  5: 'Tier 5 — Analytics & Audit',
};
