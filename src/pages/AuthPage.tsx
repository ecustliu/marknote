import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isCloud } from "../lib/db";
import { formatAuthError } from "../lib/authErrors";
import { clearSavedLogin, loadSavedLogin, saveSavedLogin } from "../lib/savedLogin";
import { BookOpen } from "lucide-react";

const saved = loadSavedLogin();

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const location = useLocation();
  const resetSuccess = (location.state as { passwordReset?: boolean } | null)?.passwordReset;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [password, setPassword] = useState(saved?.password ?? "");
  const [remember, setRemember] = useState(saved !== null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(resetSuccess ? "密码已重置，请使用新密码登录" : "");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function persistLoginIfNeeded() {
    if (remember) saveSavedLogin({ email, password });
    else clearSavedLogin();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        persistLoginIfNeeded();
      } else {
        await signUp(email, password);
        if (remember) saveSavedLogin({ email, password });
      }
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
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Marknote</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCloud ? "云端同步已启用" : "本地模式（演示）"}
          </p>

        </div>

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
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-600">密码</label>
                {mode === "login" && (
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    忘记密码？
                  </Link>
                )}
              </div>
              <input
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            {mode === "login" && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRemember(checked);
                    if (!checked) clearSavedLogin();
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-sm text-gray-600">记住登录信息</span>
              </label>
            )}

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
