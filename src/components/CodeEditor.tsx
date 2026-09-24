import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { SupportedLanguage } from '../types/competition';
import { Terminal, Code2, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  theme: 'light' | 'dark';
  readOnly?: boolean;
  onRun?: () => void;
}

const MONACO_LANG_MAP: Record<SupportedLanguage, string> = {
  python: 'python',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  r: 'r',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  theme,
  readOnly = false,
  onRun,
}) => {
  const [editorFailed, setEditorFailed] = useState(false);

  const monacoLanguage = MONACO_LANG_MAP[language] || 'python';
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  const handleEditorMount = (editor: any, monaco: any) => {
    // Add Ctrl/Cmd + Enter shortcut to trigger RUN
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });
    }
  };

  if (editorFailed) {
    return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-2 font-mono text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 text-xs rounded mb-2 border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Standard Editor Mode Active</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          spellCheck={false}
          className="w-full flex-1 bg-slate-950 p-4 font-mono text-sm text-emerald-400 border border-slate-800 rounded focus:outline-none focus:border-amber-500 resize-none"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-b-lg border-t border-slate-200 dark:border-slate-800">
      <Editor
        height="100%"
        width="100%"
        language={monacoLanguage}
        theme={monacoTheme}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorMount}
        loading={
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950">
            <Code2 className="w-7 h-7 animate-pulse text-amber-500" />
            <span className="text-xs font-mono">Initializing CodeRush IDE...</span>
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13.5,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'on',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'all',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};
