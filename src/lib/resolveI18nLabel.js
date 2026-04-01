export function resolveI18nLabel(t, label) {
  if (!label) return ''
  return String(label).includes('.') ? t(label) : label
}