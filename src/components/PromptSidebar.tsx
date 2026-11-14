import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { QUICK_PROMPTS } from '../data/presets';
import { ChatMessage, DiagramTheme } from '../types/architecture';

interface PromptSidebarProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  activeTheme: DiagramTheme;
  onGenerate: (prompt: string, overrideTheme?: DiagramTheme) => void;
  onClearHistory: () => void;
  onResetDefault: () => void;
}

export const PromptSidebar: React.FC<PromptSidebarProps> = ({
  messages,
  isGenerating,
  activeTheme,
  onGenerate,
  onClearHistory,
  onResetDefault,
}) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onGenerate(trimmed);
    setInput('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside className="w-80 lg:w-[336px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            AI Architect
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onResetDefault}
            title="Load default e-commerce preset"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear conversation history"
              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Starter Templates */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
          Quick Architectures
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_PROMPTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={isGenerating}
              onClick={() => onGenerate(preset.prompt, preset.theme)}
              className="px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500/60 text-left transition-colors disabled:opacity-50"
            >
              <span className="block text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">
                {preset.label}
              </span>
              <span className="block text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                {preset.theme}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Describe or iterate on your system
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ask Gemini to generate a new architecture from scratch, or request follow-up edits like
              &ldquo;Add a CDN in front of the API Gateway and a dead-letter queue for Kafka.&rdquo;
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 ml-4'
                  : msg.role === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300'
                    : 'bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-800/40 text-slate-800 dark:text-slate-200 mr-2'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">
                  {msg.role === 'user' ? 'Prompt' : msg.role === 'error' ? 'Error' : 'Architect'}
                </span>
                <span className="tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p>{msg.content}</p>
              {msg.stats && (
                <div className="mt-2 pt-1.5 border-t border-blue-200/50 dark:border-blue-800/40 flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{msg.stats.nodes} nodes</span>
                  <span aria-hidden="true">·</span>
                  <span>{msg.stats.edges} edges</span>
                  <span aria-hidden="true">·</span>
                  <span>{msg.stats.groups} groups</span>
                </div>
              )}
            </div>
          ))
        )}

        {isGenerating && (
          <div className="rounded-lg px-3 py-2.5 bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-800/40 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Synthesizing {activeTheme.toUpperCase()} architecture graph…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Prompt Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40"
      >
        <div className="relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isGenerating}
            placeholder="Describe a system or edit (e.g., Add Redis cache + Kafka DLQ)..."
            className="w-full resize-none bg-transparent px-3 pt-2.5 pb-9 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <div className="absolute bottom-2 left-3 right-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Enter to send · Shift+Enter newline
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-medium transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" />
              )}
              <span>Generate</span>
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
};
