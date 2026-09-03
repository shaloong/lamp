const BLOCK_TAGS = 'p|div|h[1-6]|li|blockquote|pre'

export function getFileExtension(filePath) {
  const fileName = String(filePath || '').split(/[/\\]/).pop() || ''
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return ''
  return fileName.slice(dotIndex + 1).toLowerCase()
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function plainTextToHtml(content) {
  const normalized = String(content ?? '').replace(/\r\n?/g, '\n')
  return normalized
    .split('\n')
    .map(line => `<p>${line ? escapeHtml(line) : '<br>'}</p>`)
    .join('')
}

export function decodeHtmlEntities(text) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }

  return String(text).replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, key) => {
    if (key[0] !== '#') return named[key.toLowerCase()] ?? entity

    const isHex = key[1]?.toLowerCase() === 'x'
    const value = Number.parseInt(key.slice(isHex ? 2 : 1), isHex ? 16 : 10)
    if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) return entity
    try {
      return String.fromCodePoint(value)
    } catch {
      return entity
    }
  })
}

export function htmlToPlainText(html) {
  const source = String(html ?? '')
  const hasBlockEnd = new RegExp(`</(?:${BLOCK_TAGS})\\s*>`, 'i').test(source)
  let text = source
    .replace(
      new RegExp(`<(?:${BLOCK_TAGS})\\b[^>]*>\\s*(?:<br\\s*/?>\\s*)?</(?:${BLOCK_TAGS})\\s*>`, 'gi'),
      '\n',
    )
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(new RegExp(`</(?:${BLOCK_TAGS})\\s*>`, 'gi'), '\n')
    .replace(/<[^>]*>/g, '')

  text = decodeHtmlEntities(text).replace(/\u00a0/g, ' ')
  if (hasBlockEnd && text.endsWith('\n')) {
    text = text.slice(0, -1)
  }
  return text
}
