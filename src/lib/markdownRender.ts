import { marked, Renderer } from "marked";
import { extractHeadings } from "./headings";
import {
  convertPreBlocksToMermaidDivs,
  isMermaidBlock,
  preprocessMarkdownForMermaid,
  toMermaidSource,
} from "./mermaidDetect";
import { applyMathToHtml, preprocessMath } from "./mathRender";
import { highlightCode } from "./codeHighlight";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 将 Markdown 转为带 heading id 的 HTML（预览 / PDF 导出共用） */
export function renderMarkdownToHtml(md: string): string {
  const withMermaid = preprocessMarkdownForMermaid(md);
  const { markdown, math } = preprocessMath(withMermaid);
  const headings = extractHeadings(withMermaid);
  let hi = 0;
  const renderer = new Renderer();

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
    const { html, language } = highlightCode(token.text, token.lang);
    const langClass = language ? ` language-${language}` : "";
    return `<pre class="hljs-block"><code class="hljs${langClass}">${html}</code></pre>\n`;
  };

  const html = marked.parse(markdown, { renderer }) as string;
  const withMath = applyMathToHtml(html, math);
  return convertPreBlocksToMermaidDivs(withMath);
}
