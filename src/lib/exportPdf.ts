import { renderMarkdownToHtml } from "./markdownRender";

interface ExportNotePdfOptions {
  title: string;
  content: string;
  tags?: string[];
}

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

function waitForImages(root: HTMLElement): Promise<void> {
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

/** 将笔记导出为 PDF 并触发浏览器下载 */
export async function exportNoteToPdf({ title, content, tags = [] }: ExportNotePdfOptions): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;";
  container.innerHTML = `
    <div style="padding:40px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;color:#1f2937;">${escapeHtml(title || "未命名笔记")}</h1>
      ${
        tags.length > 0
          ? `<p style="margin:0 0 24px;font-size:12px;color:#64748b;">${tags.map((t) => escapeHtml(t)).join(" · ")}</p>`
          : '<div style="margin-bottom:24px;"></div>'
      }
      <div class="preview-note">${renderMarkdownToHtml(content)}</div>
    </div>
  `;
  document.body.appendChild(container);

  try {
    await waitForImages(container);
    const { default: html2pdf } = await import("html2pdf.js");
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename: `${sanitizeFilename(title)}.pdf`,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
