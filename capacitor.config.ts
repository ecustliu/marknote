import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.marknote.app",
  appName: "Marknote",
  webDir: "dist",
  // 开发时可以指向 Vite dev server 热更新（去掉注释即可）
  // server: {
  //   url: "http://YOUR_LOCAL_IP:5173",
  //   cleartext: true,
  // },
  ios: {
    // 需要 Xcode 及 Apple Developer 账号
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
