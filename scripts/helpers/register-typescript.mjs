import { existsSync, readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'

const sourceRoot = new URL('../../src/', import.meta.url).href

// Run the actual source modules without a bundler server or generated test copies.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!specifier.startsWith('.') || !context.parentURL?.startsWith(sourceRoot)) throw error
      for (const extension of ['.ts', '.js']) {
        if (existsSync(new URL(`${specifier}${extension}`, context.parentURL))) {
          return nextResolve(`${specifier}${extension}`, context)
        }
      }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot) && url.endsWith('.ts')) {
      return {
        format: 'module',
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform', sourceUrl: url }),
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})
