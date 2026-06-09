import { createI18n } from "vue-i18n"
import zh from './locales/zh-CN.json'
import en from './locales/en-US.json'

const i18n = createI18n({
    legacy: false,  // Composition API mode
    locale: 'zh-CN',
    fallbackLocale: 'zh-CN',
    messages: {
        'zh-CN': zh,
        'en-US': en,
    },
})

export { i18n }
