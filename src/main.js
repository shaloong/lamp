import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import './preload'  // Tauri preload
import App from './App.vue'
import { i18n } from './i18n.js'
import { pluginHost } from './plugins/index'
import './builtins';  // registers built-in plugins → pluginHost.start() below

// Install the plugin i18n adapter before mounting so built-in and dynamic
// plugin labels resolve through the same namespace and fallback rules.
pluginHost.i18nService.install(i18n);

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
