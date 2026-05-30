import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isCloud } from "../lib/db";
import { BookOpen } from "lucide-react";

function formatAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "操作失败";
  const msg = err.message;
  if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
    return "无法连接 Supabase，请检查 .env.local 中的 URL 和 anon key 是否正确，并确认已执行 supabase/schema.sql";
  }
  return msg;
}

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  if (user) return <Navigate to="/" replace />;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      if (err instanceof Error && err.name === "RegistrationPending") {
        setInfo(err.message);
        setMode("login");
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Marknote</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCloud ? "云端同步已启用" : "本地模式（演示）"}
          </p>
          {isCloud && (
            <p className="text-xs text-green-600 mt-1">数据保存在 Supabase 云端</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-6">
            {mode === "login" ? "登录账号" : "创建账号"}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {info && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setInfo(""); }}
              className="text-blue-600 hover:underline ml-1 font-medium"
            >
              {mode === "login" ? "注册" : "去登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
