import { renderMarkdownToHtml } from "./markdownRender";

interface ExportNotePdfOptions {
  title: string;
  content: string;
  tags?: string[];
}

const EXPORT_WIDTH = 794;

const PDF_STYLES = `
  * { box-sizing: border-box; }
  .pdf-root { padding: 40px 48px; background: #fff; color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
  .pdf-root h1.doc-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #1f2937; }
  .pdf-root p.doc-tags { margin: 0 0 24px; font-size: 12px; color: #64748b; }
  .pdf-root .pdf-export { line-height: 1.75; color: #1f2937; font-size: 14px; }
  .pdf-root .pdf-export h1 { font-size: 1.6rem; font-weight: 700; margin: 1rem 0 .5rem; color: #1f2937; }
  .pdf-root .pdf-export h2 { font-size: 1.3rem; font-weight: 700; margin: .9rem 0 .4rem; border-bottom: 1px solid #e5e7eb; padding-bottom: .3rem; color: #1f2937; }
  .pdf-root .pdf-export h3 { font-size: 1.1rem; font-weight: 600; margin: .8rem 0 .3rem; color: #1f2937; }
  .pdf-root .pdf-export p  { margin: .5rem 0; }
  .pdf-root .pdf-export ul, .pdf-root .pdf-export ol { margin: .5rem 0; padding-left: 1.4rem; }
  .pdf-root .pdf-export ul { list-style: disc; }
  .pdf-root .pdf-export ol { list-style: decimal; }
  .pdf-root .pdf-export li { margin: .2rem 0; }
  .pdf-root .pdf-export blockquote { border-left: 3px solid #cbd5e1; padding-left: .8rem; color: #64748b; margin: .6rem 0; }
  .pdf-root .pdf-export pre { background: #0f172a; color: #e2e8f0; padding: .9rem 1rem; border-radius: .5rem; font-size: .85rem; margin: .6rem 0; white-space: pre-wrap; word-break: break-word; }
  .pdf-root .pdf-export code { background: #eef2ff; color: #4338ca; padding: .1rem .35rem; border-radius: .3rem; font-size: .85em; }
  .pdf-root .pdf-export pre code { background: transparent; color: inherit; padding: 0; }
  .pdf-root .pdf-export img { max-width: 100%; border-radius: .5rem; margin: .6rem 0; }
  .pdf-root .pdf-export a { color: #2563eb; text-decoration: underline; }
  .pdf-root .pdf-export table { border-collapse: collapse; width: 100%; margin: .6rem 0; }
  .pdf-root .pdf-export th, .pdf-root .pdf-export td { border: 1px solid #e5e7eb; padding: .4rem .7rem; text-align: left; }
  .pdf-root .pdf-export th { background: #f8fafc; font-weight: 600; }
  .pdf-root .pdf-export hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(title: string): string {
  return (title.trim() || "未命名笔记").replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80);
}

function waitForImages(root: ParentNode): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
    )
  ).then(() => undefined);
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function buildExportElement(title: string, content: string, tags: string[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "pdf-root";
  root.innerHTML = `
    <style>${PDF_STYLES}</style>
    <h1 class="doc-title">${escapeHtml(title || "未命名笔记")}</h1>
    ${
      tags.length > 0
        ? `<p class="doc-tags">${tags.map((t) => escapeHtml(t)).join(" · ")}</p>`
        : ""
    }
    <div class="pdf-export">${renderMarkdownToHtml(content)}</div>
  `;
  root.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    `width:${EXPORT_WIDTH}px`,
    "background:#fff",
    "z-index:2147483646",
  ].join(";");
  return root;
}

async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  // jsPDF html 插件在浏览器 ESM 环境下通过 globalObject.html2canvas 加载
  (window as unknown as { html2canvas: typeof html2canvas }).html2canvas = html2canvas;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  await doc.html(element, {
    margin: [12, 12, 12, 12],
    autoPaging: "text",
    width: 186,
    windowWidth: EXPORT_WIDTH,
    html2canvas: {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    },
  });

  doc.save(filename);
}

/** 将笔记导出为 PDF 并触发浏览器下载 */
export async function exportNoteToPdf({ title, content, tags = [] }: ExportNotePdfOptions): Promise<void> {
  const element = buildExportElement(title, content, tags);
  document.body.appendChild(element);

  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:#fff",
    "z-index:2147483647",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-size:14px",
    "color:#64748b",
  ].join(";");
  overlay.textContent = "正在导出 PDF…";
  document.body.appendChild(overlay);

  try {
    await waitForLayout();
    await waitForImages(element);
    overlay.remove();
    await exportElementToPdf(element, `${sanitizeFilename(title)}.pdf`);
  } finally {
    element.remove();
    overlay.remove();
  }
}
