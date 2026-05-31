import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Tag } from "lucide-react";
import MarkdownPreview from "../components/MarkdownPreview";
import { db } from "../lib/db";
import type { SharedNote } from "../types";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<SharedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setNotFound(false);

    db.getSharedNote(token)
      .then((result) => {
        if (!active) return;
        if (result) setNote(result);
        else setNotFound(true);
      })
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full text-gray-400 text-sm">
        加载中…
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full text-gray-400 gap-3 px-4">
        <BookOpen className="w-12 h-12" />
        <p className="text-sm">分享链接无效或已关闭</p>
        <Link to="/auth" className="text-sm text-blue-600 hover:underline">
          前往 Marknote
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white">
      <header className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-500">Marknote 分享</span>
      </header>

      <div className="px-8 pt-8 pb-3 border-b border-gray-100 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-800">{note.title || "未命名笔记"}</h1>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full overflow-hidden">
        <MarkdownPreview md={note.content} className="h-full min-h-[60vh]" />
      </main>

      <footer className="px-8 py-3 text-xs text-gray-300 border-t border-gray-100 flex justify-between max-w-4xl mx-auto w-full">
        <span>更新于 {new Date(note.updatedAt).toLocaleString("zh-CN")}</span>
        <Link to="/auth" className="text-blue-500 hover:underline">
          使用 Marknote 创建笔记
        </Link>
      </footer>
    </div>
  );
}
