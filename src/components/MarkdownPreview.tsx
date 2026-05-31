import { useLayoutEffect, useMemo, useRef } from "react";
import { renderMarkdownToHtml } from "../lib/markdownRender";
import { renderMermaidIn } from "../lib/mermaidRender";

export default function MarkdownPreview({ md, className = "" }: { md: string; className?: string }) {
  const html = useMemo(() => renderMarkdownToHtml(md), [md]);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const run = async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cancelled) await renderMermaidIn(root);
    };
    void run();
    return () => { cancelled = true; };
  }, [html]);

  return (
    <div
      ref={ref}
      className={`preview-note overflow-y-auto px-8 py-4 bg-gray-50/50 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
