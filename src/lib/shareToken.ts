/** 分享链接使用的公开域名，优先读环境变量（本地开发时可指向已部署地址） */
function publicOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return window.location.origin;
}

/** 生成 32 位十六进制分享 token */
export function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildShareUrl(token: string): string {
  return `${publicOrigin()}/s/${token}`;
}
