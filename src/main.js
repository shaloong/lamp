import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import './preload'  // Tauri preload
import App from './App.vue'
import { i18n } from './i18n.js'
import { pluginHost } from './plugins/index'
import './builtins';  // registers built-in plugins → pluginHost.start() below

// Register all built-in plugin locale messages before mounting so i18n
// can resolve plugin labels from the first render.
pluginHost.i18nService.mergeBuiltinMessagesInto(i18n);

pluginHost.start();

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.mount('#app')

// Load user plugins after app is mounted (workspace plugins are loaded when workspace opens)
pluginHost.startDynamic().catch(err => {
  console.error('[LAMP] Failed to load dynamic plugins:', err);
});
