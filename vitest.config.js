import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "./test"),
    },
  },
  test: {
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        settings: {
          // <link rel="stylesheet"> 삽입 시 실제 네트워크로 CSS 파일을 fetch하는 동작 비활성화
          disableCSSFileLoading: true,
          // CSS 로딩을 막더라도 link.onload 콜백이 정상적으로 호출된 것으로 처리
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
    setupFiles: ["test/setup.ts"],
  },
});
