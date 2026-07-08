"use client";

import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface SqlDiagnostic {
  line?: number;
  column?: number;
  message: string;
}

/**
 * SQL editor on CodeMirror 6 (plan F1/F2): PostgreSQL syntax highlighting, line
 * numbers, and inline lint diagnostics + gutter markers driven by the shared
 * parser. Themed via next-themes.
 */
export function SqlEditor({
  value,
  onChange,
  diagnostic,
  placeholder,
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (next: string) => void;
  diagnostic?: SqlDiagnostic | null;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();

  const extensions = useMemo(() => {
    return [
      sql({ dialect: PostgreSQL }),
      lintGutter(),
      linter((view) => {
        if (!diagnostic) return [];
        const totalLines = view.state.doc.lines;
        const lineNo = Math.min(Math.max(diagnostic.line ?? 1, 1), totalLines);
        const line = view.state.doc.line(lineNo);
        // Token-precise: start the squiggle at the reported column when we have one.
        const from =
          diagnostic.column && diagnostic.column > 0
            ? Math.min(line.from + (diagnostic.column - 1), line.to)
            : line.from;
        const to = line.to > from ? line.to : from + 1;
        const d: Diagnostic = { from, to, severity: "error", message: diagnostic.message };
        return [d];
      }),
    ];
  }, [diagnostic]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      editable={!readOnly}
      readOnly={readOnly}
      placeholder={placeholder}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      height="100%"
      className={cn(
        "h-full overflow-hidden rounded-md border border-input text-[13px] [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono",
        className,
      )}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        autocompletion: false,
      }}
    />
  );
}
