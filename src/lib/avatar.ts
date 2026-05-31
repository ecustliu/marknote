const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function validateAvatarFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("仅支持 JPG、PNG、GIF、WebP 格式的图片");
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("头像大小不能超过 2MB");
  }
}
