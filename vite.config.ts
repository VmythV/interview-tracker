import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 构建产物打成单个 index.html（JS/CSS 全部内联）。
// 理由：外链的 <script type="module"> 在 file:// 下会被 CORS 拦掉，
// 内联的 module 不发请求，所以单文件版可以直接双击打开，不必起服务器。
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist',
    // 单文件模式下 sourcemap 只能外链，file:// 又加载不了，索性关掉；
    // 需要调试就用 npm run dev。
    sourcemap: false,
  },
});
