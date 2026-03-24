import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/style.scss'
import './preload'  // Tauri preload
import App from './App.vue'
import {createI18n} from "vue-i18n"

const i18n = createI18n({
    locale: 'en', // 默认语言
    fallbackLocale: 'en' // 当检测失败时回退的语言
});

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.mount('#app')
