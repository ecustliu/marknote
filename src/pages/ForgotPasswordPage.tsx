import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "../components/AuthShell";
import { formatAuthError } from "../lib/authErrors";
import { isCloud } from "../lib/db";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setInfo("重置邮件已发送，请查收邮箱并点击链接设置新密码。");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="忘记密码"
      subtitle={isCloud ? "云端同步已启用" : "本地模式（演示）"}
    >
      {!isCloud ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            本地演示模式不支持邮件重置。请先登录，然后在侧边栏用户区域点击钥匙图标修改密码。
          </p>
          <Link
            to="/auth"
            className="block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm text-center transition-colors"
          >
            去登录
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-gray-500">
            输入注册邮箱，我们将发送密码重置链接。
          </p>
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

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {info && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading || !!info}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "发送中…" : "发送重置邮件"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
