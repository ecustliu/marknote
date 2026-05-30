import { marked, Renderer } from "marked";
import { extractHeadings } from "./headings";

/** 将 Markdown 转为带 heading id 的 HTML（预览 / PDF 导出共用） */
export function renderMarkdownToHtml(md: string): string {
  const headings = extractHeadings(md);
  let hi = 0;
  const renderer = new Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = headings[hi]?.id ?? `heading-${hi}`;
    hi++;
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  return marked.parse(md, { renderer }) as string;
}
