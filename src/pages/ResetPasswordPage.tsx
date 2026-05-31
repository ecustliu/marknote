import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "../components/AuthShell";
import { formatAuthError } from "../lib/authErrors";
import { isCloud } from "../lib/db";

export default function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (user) setSessionChecked(true);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setSessionChecked(true), 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!isCloud) {
    return <Navigate to="/auth/forgot-password" replace />;
  }

  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        验证重置链接…
      </div>
    );
  }

  if (!user) {
    return (
      <AuthShell title="链接无效">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            重置链接无效或已过期，请重新申请密码重置邮件。
          </p>
          <Link
            to="/auth/forgot-password"
            className="block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm text-center transition-colors"
          >
            重新申请
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="设置新密码" subtitle={`${user.email}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">新密码</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">确认新密码</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="再次输入新密码"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "保存中…" : "保存新密码"}
        </button>
      </form>
    </AuthShell>
  );
}
