import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import {resolve} from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue-i18n'],
    }),
    Components({
      resolvers: [
          ElementPlusResolver({
            importStyle: "sass",
          }),
        ],
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/element/index.scss" as *;`,
      },
    },
  },
  // 开发服务器配置
  server: {
    port: 1086,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
  // 清除 Vite 缓存时排除 Tauri
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
    include: [
      '@tiptap/core',
      '@tiptap/pm/state',
      '@tiptap/pm/view',
    ],
  }
})