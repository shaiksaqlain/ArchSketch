import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import mermaid from 'mermaid';
import { ArchitectureDiagram } from '../types/architecture';
import { diagramToMermaid, mermaidToDiagram } from '../utils/mermaid';

interface MermaidPanelProps {
  diagram: ArchitectureDiagram;
  isDark: boolean;
  onApplyMermaid: (nextDiagram: ArchitectureDiagram) => void;
  onNotify: (message: string, variant?: 'info' | 'success' | 'error') => void;
}

type CodeTab = 'code' | 'preview' | 'json';

export const MermaidPanel: React.FC<MermaidPanelProps> = ({
  diagram,
  isDark,
  onApplyMermaid,
  onNotify,
}) => {
  const generatedCode = useMemo(() => diagramToMermaid(diagram), [diagram]);
  const [draftCode, setDraftCode] = useState(generatedCode);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<CodeTab>('code');
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    setDraftCode(generatedCode);
    setDirty(false);
  }, [generatedCode]);

  useEffect(() => {
    if (activeTab !== 'preview') return;
    let cancelled = false;

    const renderMermaid = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: { curve: 'basis', htmlLabels: true },
        });
        const id = `mermaid-preview-${Date.now()}`;
        const { svg } = await mermaid.render(id, draftCode);
        if (!cancelled) {
          setRenderedSvg(svg);
          setRenderError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setRenderError(err?.message || 'Unable to render Mermaid syntax preview.');
        }
      }
    };

    renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [activeTab, draftCode, isDark]);

  const handleCopy = async () => {
    const content = activeTab === 'json' ? JSON.stringify(diagram, null, 2) : draftCode;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onNotify(
        activeTab === 'json' ? 'Copied JSON schema to clipboard.' : 'Copied Mermaid syntax to clipboard.',
        'success'
      );
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Failed to access clipboard.', 'error');
    }
  };

  const handleApplyToCanvas = () => {
    try {
      const updated = mermaidToDiagram(draftCode, diagram);
      if (updated.nodes.length === 0) {
        onNotify('No valid Mermaid nodes detected. Check your syntax.', 'error');
        return;
      }
      onApplyMermaid(updated);
      setDirty(false);
      onNotify('Synced Mermaid edits to interactive canvas.', 'success');
    } catch {
      onNotify('Could not parse Mermaid syntax.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 min-w-0">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Mermaid Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Mermaid Render
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'json'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            JSON
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {dirty && activeTab === 'code' && (
            <button
              type="button"
              onClick={handleApplyToCanvas}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync Canvas</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'code' && (
          <div className="h-full flex flex-col">
            <textarea
              value={draftCode}
              onChange={(e) => {
                setDraftCode(e.target.value);
                setDirty(e.target.value !== generatedCode);
              }}
              spellCheck={false}
              aria-label="Mermaid flowchart code"
              className="flex-1 w-full resize-none p-4 font-mono text-[12.5px] leading-relaxed bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Edit Mermaid syntax directly and click Sync Canvas for bi-directional updates.</span>
              <span className="font-mono tabular-nums">{draftCode.split('\n').length} lines</span>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full overflow-auto p-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            {renderError ? (
              <div className="max-w-md p-4 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300 font-mono">
                {renderError}
              </div>
            ) : (
              <div
                className="max-w-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderedSvg }}
              />
            )}
          </div>
        )}

        {activeTab === 'json' && (
          <pre className="h-full overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
            {JSON.stringify(diagram, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
