import type { createI18n } from 'vue-i18n';

type I18nInstance = ReturnType<typeof createI18n>;
type LocaleMessages = Record<string, unknown>;
type PluginMessagesByLocale = Record<string, LocaleMessages>;

export function pluginNamespace(pluginId: string): string {
  return `plugins.${pluginId.replace(/\./g, '-')}`;
}

export function pluginI18nKey(pluginId: string, key: string): string {
  const normalizedKey = key.replace(/^\./, '');
  return `${pluginNamespace(pluginId)}.${normalizedKey}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function setNested(target: Record<string, unknown>, dottedKey: string, value: unknown): void {
  const parts = dottedKey.split('.').filter(Boolean);
  if (parts.length === 0) return;

  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!isPlainObject(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function normalizeMessages(pluginId: string, messages: LocaleMessages): LocaleMessages {
  const ns = pluginNamespace(pluginId);
  const normalized: LocaleMessages = {};

  for (const [key, value] of Object.entries(messages || {})) {
    const localKey = key === ns
      ? ''
      : key.startsWith(`${ns}.`)
        ? key.slice(ns.length + 1)
        : key;

    if (!localKey) continue;

    if (localKey.includes('.')) {
      setNested(normalized, localKey, value);
    } else {
      normalized[localKey] = value;
    }
  }

  return normalized;
}

function deepMerge(base: LocaleMessages, patch: LocaleMessages): LocaleMessages {
  const out: LocaleMessages = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key] as LocaleMessages, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function getRefValue(value: unknown): unknown {
  if (value && typeof value === 'object' && 'value' in value) {
    return (value as { value: unknown }).value;
  }
  return value;
}

export class PluginI18nService {
  private appI18n: I18nInstance | null = null;
  private messagesByPlugin = new Map<string, PluginMessagesByLocale>();

  install(i18nInstance: I18nInstance): void {
    this.appI18n = i18nInstance;
    this.applyAll();
  }

  mergeBuiltinMessagesInto(i18nInstance: I18nInstance): void {
    this.install(i18nInstance);
  }

  getNamespace(pluginId: string): string {
    return pluginNamespace(pluginId);
  }

  key(pluginId: string, localKey: string): string {
    return pluginI18nKey(pluginId, localKey);
  }

  setLocaleMessages(pluginId: string, locale: string, messages: LocaleMessages): void {
    const existing = this.messagesByPlugin.get(pluginId) ?? {};
    existing[locale] = deepMerge(existing[locale] ?? {}, normalizeMessages(pluginId, messages));
    this.messagesByPlugin.set(pluginId, existing);
    this.applyPlugin(pluginId);
  }

  setAllLocaleMessages(pluginId: string, messagesByLocale: PluginMessagesByLocale): void {
    for (const [locale, messages] of Object.entries(messagesByLocale || {})) {
      this.setLocaleMessages(pluginId, locale, messages);
    }
  }

  getLocale(): string {
    const locale = getRefValue(this.appI18n?.global.locale);
    return typeof locale === 'string' ? locale : 'zh-CN';
  }

  getFallbackLocale(): string {
    const fallback = getRefValue(this.appI18n?.global.fallbackLocale);
    if (typeof fallback === 'string') return fallback;
    if (Array.isArray(fallback) && typeof fallback[0] === 'string') return fallback[0];
    return 'zh-CN';
  }

  t(pluginId: string, localKey: string, params?: Record<string, unknown>): string {
    const fullKey = this.key(pluginId, localKey);
    const translate = this.appI18n?.global.t;
    if (!translate) return fullKey;
    return params ? translate(fullKey, params) : translate(fullKey);
  }

  private applyAll(): void {
    for (const pluginId of this.messagesByPlugin.keys()) {
      this.applyPlugin(pluginId);
    }
  }

  private applyPlugin(pluginId: string): void {
    if (!this.appI18n) return;
    const messagesByLocale = this.messagesByPlugin.get(pluginId);
    if (!messagesByLocale) return;

    const appLocales = this.getAppLocales();
    const pluginLocales = Object.keys(messagesByLocale);
    const fallbackLocale = this.getFallbackLocale();
    const fallbackMessages =
      messagesByLocale[fallbackLocale]
      ?? messagesByLocale['zh-CN']
      ?? messagesByLocale['en-US']
      ?? messagesByLocale[pluginLocales[0]];

    for (const locale of appLocales) {
      const localMessages = messagesByLocale[locale] ?? fallbackMessages;
      if (localMessages) {
        this.mergeNamespacedLocale(locale, pluginId, localMessages);
      }
    }
  }

  private getAppLocales(): string[] {
    const messages = getRefValue(this.appI18n?.global.messages) as Record<string, unknown> | undefined;
    const locales = messages ? Object.keys(messages) : [];
    const fallbackLocale = this.getFallbackLocale();
    const currentLocale = this.getLocale();
    return Array.from(new Set([currentLocale, fallbackLocale, ...locales].filter(Boolean)));
  }

  private mergeNamespacedLocale(locale: string, pluginId: string, messages: LocaleMessages): void {
    if (!this.appI18n) return;

    const patch: LocaleMessages = {};
    setNested(patch, this.getNamespace(pluginId), messages);

    const globalApi = this.appI18n.global as unknown as {
      mergeLocaleMessage?: (locale: string, message: LocaleMessages) => void;
      setLocaleMessage?: (locale: string, message: LocaleMessages) => void;
      getLocaleMessage?: (locale: string) => LocaleMessages;
      messages?: { value?: Record<string, LocaleMessages> };
    };

    if (typeof globalApi.mergeLocaleMessage === 'function') {
      globalApi.mergeLocaleMessage(locale, patch);
      return;
    }

    const current = typeof globalApi.getLocaleMessage === 'function'
      ? globalApi.getLocaleMessage(locale)
      : (globalApi.messages?.value?.[locale] ?? {});

    const merged = deepMerge(current, patch);
    if (typeof globalApi.setLocaleMessage === 'function') {
      globalApi.setLocaleMessage(locale, merged);
    } else if (globalApi.messages?.value) {
      globalApi.messages.value[locale] = merged;
    }
  }
}
