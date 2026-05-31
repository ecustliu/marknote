let initialized = false;

/** 在容器内渲染未处理的 Mermaid 图表（预览 / PDF 导出共用） */
export async function renderMermaidIn(root: ParentNode): Promise<void> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mermaid:not([data-processed])"));
  if (nodes.length === 0) return;

  const mermaid = (await import("mermaid")).default;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
    });
    initialized = true;
  }

  try {
    await mermaid.run({ nodes });
  } catch (err) {
    console.error("Mermaid render failed:", err);
  }
}
