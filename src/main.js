import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/style.scss'
import './preload'  // Tauri preload
import App from './App.vue'
import {createI18n} from "vue-i18n"

// Start the plugin system synchronously BEFORE mounting the app.
// Builtins are imported first and registered with PluginHost.
import { pluginHost } from './plugins/index';
import './builtins';  // registers built-in plugins → pluginHost.start() below

pluginHost.start();

const i18n = createI18n({
    legacy: false,  // Composition API模式
    locale: 'en', // 默认语言
    fallbackLocale: 'en', // 当检测失败时回退的语言
});

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.mount('#app')

// Load user plugins after app is mounted (workspace plugins are loaded when workspace opens)
pluginHost.startDynamic().catch(err => {
  console.error('[LAMP] Failed to load dynamic plugins:', err);
});
