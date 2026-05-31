export function formatAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "操作失败";
  const msg = err.message;
  if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
    return "无法连接 Supabase，请检查 .env.local 中的 URL 和 anon key 是否正确，并确认已执行 supabase/schema.sql";
  }
  if (msg.toLowerCase().includes("email not confirmed")) {
    return "邮箱尚未确认。请查收注册邮件并点击确认链接，或在 Supabase 控制台关闭 Confirm email（Authentication → Providers → Email）";
  }
  if (msg.toLowerCase().includes("same password")) {
    return "新密码不能与当前密码相同";
  }
  return msg;
}
