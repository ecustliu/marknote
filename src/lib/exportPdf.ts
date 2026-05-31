import { renderMarkdownToHtml } from "./markdownRender";

interface ExportNotePdfOptions {
  title: string;
  content: string;
  tags?: string[];
}

/** A4 尺寸 @96dpi，与 CSS px 对应 */
const EXPORT_WIDTH = 794;

const PDF_STYLES = `
  * { box-sizing: border-box; }
  .pdf-root {
    padding: 40px 48px; background: #fff; color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 14px; line-height: 1.75;
  }
  .pdf-root h1.doc-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #1f2937; }
  .pdf-root p.doc-tags   { margin: 0 0 24px; font-size: 12px; color: #64748b; }
  .pdf-root .pdf-export h1 { font-size: 1.6rem; font-weight: 700; margin: 1rem 0 .5rem; }
  .pdf-root .pdf-export h2 { font-size: 1.3rem; font-weight: 700; margin: .9rem 0 .4rem; border-bottom: 1px solid #e5e7eb; padding-bottom: .3rem; }
  .pdf-root .pdf-export h3 { font-size: 1.1rem; font-weight: 600; margin: .8rem 0 .3rem; }
  .pdf-root .pdf-export p  { margin: .5rem 0; }
  .pdf-root .pdf-export ul, .pdf-root .pdf-export ol { margin: .5rem 0; padding-left: 1.4rem; }
  .pdf-root .pdf-export ul { list-style: disc; }
  .pdf-root .pdf-export ol { list-style: decimal; }
  .pdf-root .pdf-export li { margin: .2rem 0; }
  .pdf-root .pdf-export blockquote { border-left: 3px solid #cbd5e1; padding-left: .8rem; color: #64748b; margin: .6rem 0; }
  .pdf-root .pdf-export pre { background: #0f172a; color: #e2e8f0; padding: .9rem 1rem; border-radius: .5rem; font-size: .85rem; margin: .6rem 0; white-space: pre-wrap; word-break: break-word; }
  .pdf-root .pdf-export code { background: #eef2ff; color: #4338ca; padding: .1rem .35rem; border-radius: .3rem; font-size: .85em; }
  .pdf-root .pdf-export pre code { background: transparent; color: inherit; padding: 0; }
  .pdf-root .pdf-export img { max-width: 100%; border-radius: .5rem; margin: .6rem 0; display: block; }
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

function buildExportElement(title: string, content: string, tags: string[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "pdf-root";
  const tagsHtml =
    tags.length > 0
      ? `<p class="doc-tags">${tags.map((t) => escapeHtml(t)).join(" · ")}</p>`
      : "";
  root.innerHTML = `<style>${PDF_STYLES}</style>
<h1 class="doc-title">${escapeHtml(title || "未命名笔记")}</h1>
${tagsHtml}
<div class="pdf-export">${renderMarkdownToHtml(content)}</div>`;
  root.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    `width:${EXPORT_WIDTH}px`,
    "min-height:400px",
    "background:#fff",
    "z-index:2147483646",
  ].join(";");
  return root;
}

function waitForImages(root: ParentNode): Promise<void> {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  ).then(() => undefined);
}

function waitForFrames(n = 3): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;
    const tick = () => { if (++count >= n) resolve(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

/**
 * html2canvas 截图 → 按 A4 分页贴入 jsPDF
 * 文字全部变成像素，彻底避开 jsPDF 字体 / 中文乱码问题
 */
async function canvasToPdf(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });

  const pageW = pdf.internal.pageSize.getWidth();   // px 单位
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28; // px
  const printW = pageW - margin * 2;
  const printH = pageH - margin * 2;

  // canvas 实际内容高度（按 printW 缩放后）
  const scale = printW / canvas.width;
  const totalH = canvas.height * scale;

  // 每页在 canvas 上的切片高度
  const sliceH = printH / scale;

  let pageTop = 0;
  let pageIndex = 0;

  while (pageTop < canvas.height) {
    if (pageIndex > 0) pdf.addPage();

    const sliceCanvas = document.createElement("canvas");
    const actualSlice = Math.min(sliceH, canvas.height - pageTop);
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(actualSlice);
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, -pageTop, canvas.width, canvas.height);

    const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
    const renderH = actualSlice * scale;
    pdf.addImage(imgData, "JPEG", margin, margin, printW, renderH);

    pageTop += sliceH;
    pageIndex++;
  }

  // 防止空文档
  if (pageIndex === 0 || totalH === 0) throw new Error("PDF 内容为空");

  pdf.save(filename);
}

/** 将笔记导出为 PDF 并触发浏览器下载（所有文字渲染为图片，支持中文） */
export async function exportNoteToPdf({ title, content, tags = [] }: ExportNotePdfOptions): Promise<void> {
  const element = buildExportElement(title, content, tags);
  document.body.appendChild(element);

  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed", "inset:0", "background:rgba(255,255,255,.92)",
    "z-index:2147483647", "display:flex", "flex-direction:column",
    "align-items:center", "justify-content:center",
    "gap:12px", "font-size:14px", "color:#64748b",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif",
  ].join(";");
  overlay.innerHTML = `<div style="width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite"></div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<span>正在生成 PDF…</span>`;
  document.body.appendChild(overlay);

  try {
    await waitForImages(element);
    await waitForFrames(4);

    const finalH = Math.max(element.scrollHeight, element.offsetHeight, 400);
    element.style.height = `${finalH}px`;
    await waitForFrames(2);

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: EXPORT_WIDTH,
      height: finalH,
      windowWidth: EXPORT_WIDTH,
      windowHeight: finalH,
    });

    if (!canvas.width || !canvas.height) throw new Error("截图内容为空");

    await canvasToPdf(canvas, `${sanitizeFilename(title)}.pdf`);
  } finally {
    element.remove();
    overlay.remove();
  }
}
