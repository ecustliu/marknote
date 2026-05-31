import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, X } from "lucide-react";
import { buildShareUrl } from "../lib/shareToken";
import { isCloud } from "../lib/db";

interface Props {
  shareToken: string | null;
  onEnableShare: () => Promise<void>;
  onDisableShare: () => Promise<void>;
}

export default function SharePanel({ shareToken, onEnableShare, onDisableShare }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareUrl = shareToken ? buildShareUrl(shareToken) : "";

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onEnableShare();
    } catch {
      alert("开启分享失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }, [busy, onEnableShare]);

  const handleDisable = useCallback(async () => {
    if (busy || !confirm("关闭分享后，已有链接将失效，确定继续？")) return;
    setBusy(true);
    try {
      await onDisableShare();
    } catch {
      alert("关闭分享失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }, [busy, onDisableShare]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("复制失败，请手动复制链接");
    }
  }, [shareUrl]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded transition-colors ${
          shareToken ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-500 hover:bg-gray-100"
        }`}
        title="分享"
      >
        <Link2 className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">分享笔记</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isCloud && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5 mb-3">
                本地模式下链接仅在本浏览器有效；配置 Supabase 后可分享给他人。
              </p>
            )}

            {shareToken ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">任何人可通过此链接只读查看</p>
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none truncate"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => void handleCopy()}
                    className="flex-shrink-0 p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                    title="复制链接"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => void handleDisable()}
                  disabled={busy}
                  className="w-full text-sm text-red-600 hover:bg-red-50 rounded py-1.5 transition-colors disabled:opacity-40"
                >
                  关闭分享
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">生成只读链接，他人无需登录即可查看</p>
                <button
                  onClick={() => void handleEnable()}
                  disabled={busy}
                  className="w-full text-sm bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  {busy ? "生成中…" : "生成分享链接"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
