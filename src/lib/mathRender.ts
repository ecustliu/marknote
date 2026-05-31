import katex from "katex";

export interface MathSlot {
  tex: string;
  display: boolean;
}

const MATH_PLACEHOLDER = /⟦MATH:(\d+)⟧/g;

type MdPart = { kind: "text"; content: string } | { kind: "code"; content: string };

/** 将代码块拆出，避免其中的 $ 被误识别为公式 */
function splitMarkdownParts(md: string): MdPart[] {
  const parts: MdPart[] = [];
  const re = /```[\s\S]*?```|`[^`\n]+`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(md)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", content: md.slice(last, match.index) });
    }
    parts.push({ kind: "code", content: match[0] });
    last = match.index + match[0].length;
  }
  if (last < md.length) parts.push({ kind: "text", content: md.slice(last) });
  if (parts.length === 0) parts.push({ kind: "text", content: md });
  return parts;
}

function extractMathFromText(text: string, math: MathSlot[]): string {
  let out = text;

  // 块级：$$ ... $$ 或 \[ ... \]
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
    math.push({ tex: tex.trim(), display: true });
    return `⟦MATH:${math.length - 1}⟧`;
  });
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) => {
    math.push({ tex: tex.trim(), display: true });
    return `⟦MATH:${math.length - 1}⟧`;
  });

  // 行内：$ ... $ 或 \( ... \)，不含换行
  out = out.replace(/(?<!\\)\$(?!\$)([^\$\n]+?)(?<!\\)\$(?!\$)/g, (_, tex: string) => {
    math.push({ tex: tex.trim(), display: false });
    return `⟦MATH:${math.length - 1}⟧`;
  });
  out = out.replace(/\\\(([^\n]+?)\\\)/g, (_, tex: string) => {
    math.push({ tex: tex.trim(), display: false });
    return `⟦MATH:${math.length - 1}⟧`;
  });

  return out;
}

/** 在 marked 解析前提取公式并替换为占位符 */
export function preprocessMath(md: string): { markdown: string; math: MathSlot[] } {
  const math: MathSlot[] = [];
  const markdown = splitMarkdownParts(md)
    .map((part) =>
      part.kind === "code" ? part.content : extractMathFromText(part.content, math)
    )
    .join("");
  return { markdown, math };
}

function renderTex(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return display ? `$$${tex}$$` : `$${tex}$`;
  }
}

/** 将 HTML 中的公式占位符替换为 KaTeX 渲染结果 */
export function applyMathToHtml(html: string, math: MathSlot[]): string {
  if (math.length === 0) return html;
  return html.replace(MATH_PLACEHOLDER, (_, index: string) => {
    const slot = math[Number(index)];
    if (!slot) return "";
    return renderTex(slot.tex, slot.display);
  });
}
