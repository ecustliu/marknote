import { marked, Renderer } from "marked";
import { extractHeadings } from "./headings";
import {
  convertPreBlocksToMermaidDivs,
  isMermaidBlock,
  preprocessMarkdownForMermaid,
  toMermaidSource,
} from "./mermaidDetect";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 将 Markdown 转为带 heading id 的 HTML（预览 / PDF 导出共用） */
export function renderMarkdownToHtml(md: string): string {
  const normalized = preprocessMarkdownForMermaid(md);
  const headings = extractHeadings(normalized);
  let hi = 0;
  const renderer = new Renderer();
  const defaultCode = renderer.code.bind(renderer);

  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = headings[hi]?.id ?? `heading-${hi}`;
    hi++;
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };

  renderer.code = function (token) {
    if (isMermaidBlock(token.text, token.lang)) {
      const src = toMermaidSource(token.text, token.lang);
      return `<div class="mermaid">${escapeHtml(src)}</div>\n`;
    }
    return defaultCode(token);
  };

  const html = marked.parse(normalized, { renderer }) as string;
  return convertPreBlocksToMermaidDivs(html);
}
