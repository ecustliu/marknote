export interface TocItem {
  index: number;
  id: string;
  level: number;
  text: string;
}

/** 从 Markdown 提取标题，生成与预览面板一致的 anchor id（跳过围栏代码块内内容） */
export function extractHeadings(md: string): TocItem[] {
  const items: TocItem[] = [];
  const slugCount = new Map<string, number>();
  let inFence = false;

  for (const line of md.split("\n")) {
    if (/^(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2]
      .replace(/\*\*|__|\*|_|`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
    if (!text) continue;

    const id = nextHeadingId(text, slugCount);
    items.push({ index: items.length, id, level, text });
  }

  return items;
}

function nextHeadingId(text: string, slugCount: Map<string, number>): string {
  let base = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "heading";

  const count = slugCount.get(base) ?? 0;
  slugCount.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}
