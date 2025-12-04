import { createApp } from 'vue'
import './styles/style.scss'
import App from './App.vue'
import {createI18n} from "vue-i18n"

const i18n = createI18n({
    locale: 'en', // 默认语言
    fallbackLocale: 'en' // 当检测失败时回退的语言
});

createApp(App).use(i18n).mount('#app')
