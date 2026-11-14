import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Code2,
  Columns2,
  Download,
  FileCode2,
  FileJson,
  Image as ImageIcon,
  LayoutGrid,
  Moon,
  PanelLeft,
  Plus,
  Redo2,
  Shapes,
  Sun,
  Undo2,
} from 'lucide-react';
import { DiagramTheme, ViewMode } from '../types/architecture';
import { THEME_OPTIONS } from '../utils/categoryMeta';

interface TopToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  theme: DiagramTheme;
  onThemeChange: (theme: DiagramTheme) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddNode: () => void;
  onAutoLayout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportMermaid: () => void;
  onExportJson: () => void;
  isExporting: boolean;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  title,
  onTitleChange,
  theme,
  onThemeChange,
  viewMode,
  onViewModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddNode,
  onAutoLayout,
  isDark,
  onToggleDark,
  sidebarOpen,
  onToggleSidebar,
  onExportPng,
  onExportSvg,
  onExportMermaid,
  onExportJson,
  isExporting,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 lg:px-4 flex items-center justify-between gap-4 z-30">
      {/* Left Zone: Brand + Diagram Title + Platform Theme */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide Architect Panel' : 'Show Architect Panel'}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Shapes className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white whitespace-nowrap hidden sm:inline">
            ArchForge
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label="Diagram title"
          className="min-w-0 w-40 md:w-60 px-2 py-1 text-sm font-medium rounded-md bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:bg-slate-100 dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
        />

        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as DiagramTheme)}
          aria-label="Cloud platform theme"
          className="hidden md:block px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
        >
          {THEME_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Center Zone: View Switcher & Canvas Tools */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          role="tablist"
          aria-label="Workspace view mode"
          className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'canvas'}
            onClick={() => onViewModeChange('canvas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'canvas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>Canvas</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'split'}
            onClick={() => onViewModeChange('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'mermaid'}
            onClick={() => onViewModeChange('mermaid')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'mermaid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Mermaid</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl/Cmd + Z)"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd + Shift + Z)"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onAddNode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Node</span>
          </button>
          <button
            type="button"
            onClick={onAutoLayout}
            title="Recompute smart tier auto-layout"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Auto-Layout</span>
          </button>
        </div>
      </div>

      {/* Right Zone: Theme Toggle + Export Menu */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleDark}
          title={isDark ? 'Switch to Light Canvas' : 'Switch to Dark Canvas'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting…' : 'Export'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 z-50">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportPng();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Export PNG (2x)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportSvg();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Shapes className="w-3.5 h-3.5 text-emerald-500" />
                <span>Export Vector SVG</span>
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportMermaid();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
                <span>Download Mermaid (.mmd)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportJson();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FileJson className="w-3.5 h-3.5 text-amber-500" />
                <span>Download JSON (.json)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
