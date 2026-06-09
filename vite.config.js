import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: ['vue-i18n'],
    }),
    Components({
      excludeNames: ['CommandPalette', 'SettingsDialog'],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: '/',
  server: {
    port: 1086,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/@tiptap/') || id.includes('/prosemirror-')) {
            return 'vendor-tiptap'
          }

          if (
            id.includes('/vue/')
            || id.includes('/@vue/')
            || id.includes('/vue-i18n/')
            || id.includes('/pinia/')
          ) {
            return 'vendor-framework'
          }

          if (id.includes('/@tauri-apps/')) {
            return 'vendor-tauri'
          }

          if (id.includes('/lucide-vue-next/') || id.includes('/reka-ui/')) {
            return 'vendor-ui'
          }

          return undefined
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
    include: [
      '@tiptap/core',
      '@tiptap/pm/state',
      '@tiptap/pm/view',
    ],
  },
})
