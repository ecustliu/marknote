import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 同一份 Web 构建产物会被：
//  - 浏览器/Netlify 直接使用
//  - Tauri 桌面壳加载 (读取 dist/)
//  - Capacitor 移动壳加载 (读取 dist/)
export default defineConfig({
    plugins: [react()],
    // Tauri 需要固定端口且不在被占用时自动切换
    server: {
        port: 5173,
        strictPort: false,
    },
    build: {
        outDir: "dist",
        // Capacitor / Tauri 用相对路径加载本地资源
        target: "es2020",
    },
});
