/** Mermaid 图表首行常见关键字 */
const MERMAID_FIRST_LINE =
  /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|journey|timeline|mindmap|quadrantChart|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/i;

/** 判断代码块内容是否为 Mermaid 语法 */
export function looksLikeMermaid(text: string): boolean {
  const firstLine = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return firstLine ? MERMAID_FIRST_LINE.test(firstLine) : false;
}

export function isMermaidBlock(text: string, lang?: string | null): boolean {
  const language = lang?.trim().toLowerCase();
  if (language === "mermaid" || language === "flowchart") return true;
  return looksLikeMermaid(text);
}

/** 规范化 Mermaid 源码（处理 ```flowchart 这类误标语言） */
export function toMermaidSource(text: string, lang?: string | null): string {
  const trimmed = text.trim();
  const language = lang?.trim().toLowerCase();
  if (language === "flowchart" && !looksLikeMermaid(trimmed)) {
    return `flowchart ${trimmed}`;
  }
  return trimmed;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

/** 将未标注语言的 Mermaid 围栏代码块补全为 ```mermaid */
export function normalizeMermaidFences(md: string): string {
  return md.replace(/^```([^\n]*)\r?\n([\s\S]*?)^```\s*$/gm, (full, lang, body) => {
    const language = lang.trim().toLowerCase();
    if (language === "mermaid") return full;
    if (language === "flowchart") return `\`\`\`mermaid\n${toMermaidSource(body, lang)}\n\`\`\``;
    if (language) return full;
    if (looksLikeMermaid(body)) return `\`\`\`mermaid\n${body.trim()}\n\`\`\``;
    return full;
  });
}

/** tiptap html 模式下可能直接输出 <pre><code>，先还原为围栏代码块 */
export function normalizeMermaidHtmlBlocks(md: string): string {
  return md.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi,
    (_full, lang, code) => {
      const text = decodeHtmlEntities(code.replace(/^\n|\n$/g, ""));
      if (!isMermaidBlock(text, lang)) return _full;
      return `\`\`\`mermaid\n${toMermaidSource(text, lang)}\n\`\`\``;
    }
  );
}

/** marked 若仍输出 <pre><code>，在 HTML 层再转一次 */
export function convertPreBlocksToMermaidDivs(html: string): string {
  return html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi,
    (full, lang, code) => {
      const text = decodeHtmlEntities(code.replace(/^\n|\n$/g, ""));
      if (!isMermaidBlock(text, lang)) return full;
      const src = toMermaidSource(text, lang)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return `<div class="mermaid">${src}</div>\n`;
    }
  );
}

export function preprocessMarkdownForMermaid(md: string): string {
  return normalizeMermaidHtmlBlocks(normalizeMermaidFences(md));
}
