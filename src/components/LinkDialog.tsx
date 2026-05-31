import { useEffect, useState } from "react";
import { Link2, Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  initialUrl: string;
  initialText: string;
  hasExistingLink: boolean;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
  onRemove?: () => void;
}

export default function LinkDialog({
  open,
  initialUrl,
  initialText,
  hasExistingLink,
  onClose,
  onSubmit,
  onRemove,
}: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setText(initialText);
      setError("");
    }
  }, [open, initialUrl, initialText]);

  if (!open) return null;

  function handleClose() {
    setError("");
    onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("请填写链接地址");
      return;
    }
    onSubmit(url.trim(), text.trim());
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              {hasExistingLink ? "编辑链接" : "插入链接"}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">链接地址</label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">显示文本</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="链接名称（留空则使用地址）"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">可先选中文字再插入，会自动填入显示文本</p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            {hasExistingLink && onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  handleClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                移除
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
