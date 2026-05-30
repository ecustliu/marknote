// 运行环境探测：用于「重 Web 编辑、轻移动查看」的能力分级。
// 移动端 (Capacitor 原生壳) 默认只读渲染，桌面/Web 提供完整编辑器。

declare global {
  interface Window {
    // Capacitor 注入的全局对象
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    // Tauri 注入的全局对象
    __TAURI__?: unknown;
  }
}

export function isNativeMobile(): boolean {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

export function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/** 是否启用完整编辑能力（桌面 / 桌面浏览器）。移动端窄屏默认只读查看。 */
export function canFullEdit(): boolean {
  if (isNativeMobile()) return false;
  // 窄屏（手机浏览器）也降级为只读，避免在小屏上塞复杂编辑器
  if (typeof window !== "undefined" && window.innerWidth < 640) return false;
  return true;
}
