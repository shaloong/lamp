import { randomUUID } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function extractReleaseNotes(changelog, version) {
  const headings = [...changelog.matchAll(/^## \[([^\]]+)\][^\r\n]*$/gm)]
  const matches = headings.filter(heading => heading[1] === version)
  if (matches.length !== 1) throw new Error(`Expected exactly one changelog entry for ${version}`)
  const heading = matches[0]
  const next = headings[headings.indexOf(heading) + 1]
  const body = changelog.slice(heading.index + heading[0].length, next?.index).trim()
  if (!body) throw new Error(`Changelog entry for ${version} is empty`)
  return body
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const body = extractReleaseNotes(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'), version)
  if (process.env.GITHUB_OUTPUT) {
    const delimiter = `notes_${randomUUID()}`
    appendFileSync(process.env.GITHUB_OUTPUT, `body<<${delimiter}\n${body}\n${delimiter}\n`)
  }
  console.log(body)
}
