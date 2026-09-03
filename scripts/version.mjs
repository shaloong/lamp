import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const paths = {
  packageJson: resolve(rootDir, 'package.json'),
  cargoToml: resolve(rootDir, 'src-tauri', 'Cargo.toml'),
  cargoLock: resolve(rootDir, 'src-tauri', 'Cargo.lock'),
  tauriConfig: resolve(rootDir, 'src-tauri', 'tauri.conf.json'),
}

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceJsonVersion(source, currentVersion, nextVersion) {
  const versionPattern = /^(\s*"version"\s*:\s*")[^"]+("\s*,?\s*)$/m
  const match = versionPattern.exec(source)
  if (!match || !source.slice(match.index, match.index + match[0].length).includes(currentVersion)) {
    throw new Error('Missing top-level version in JSON file')
  }
  return source.replace(versionPattern, `$1${nextVersion}$2`)
}

function findTomlSection(source, sectionName) {
  const headerPattern = new RegExp(`^\\[${escapeRegExp(sectionName)}\\][ \\t]*(?:\\r?\\n|$)`, 'm')
  const headerMatch = headerPattern.exec(source)
  if (!headerMatch) throw new Error(`Missing [${sectionName}] in Cargo.toml`)

  const start = headerMatch.index + headerMatch[0].length
  const nextHeader = /^\[/m.exec(source.slice(start))
  const end = nextHeader ? start + nextHeader.index : source.length
  return { start, end, content: source.slice(start, end) }
}

function readTomlValue(source, sectionName, key) {
  const section = findTomlSection(source, sectionName).content
  const valuePattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*(?:"([^"]+)"|\\{[^}]*version\\s*=\\s*"([^"]+)"[^}]*\\})`, 'm')
  const valueMatch = valuePattern.exec(section)
  if (!valueMatch) throw new Error(`Missing ${key} in Cargo.toml [${sectionName}]`)
  return valueMatch[1] || valueMatch[2]
}

function replaceTomlValue(source, sectionName, key, value) {
  const section = findTomlSection(source, sectionName)
  const keyPattern = new RegExp(`(^\\s*${escapeRegExp(key)}\\s*=\\s*")[^"]+("\\s*$)`, 'm')
  if (!keyPattern.test(section.content)) {
    throw new Error(`Missing ${key} in Cargo.toml [${sectionName}]`)
  }

  const updatedSection = section.content.replace(keyPattern, `$1${value}$2`)
  return source.slice(0, section.start) + updatedSection + source.slice(section.end)
}

function cleanVersion(value) {
  const match = String(value || '').match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/)
  if (!match) throw new Error(`Invalid version declaration: ${value}`)
  return match[0]
}

function majorMinor(version) {
  return cleanVersion(version).split('.').slice(0, 2).join('.')
}

function assertEqual(label, values) {
  const unique = new Set(Object.values(values))
  if (unique.size > 1) {
    const details = Object.entries(values).map(([name, value]) => `${name}=${value}`).join(', ')
    throw new Error(`${label} versions differ: ${details}`)
  }
}

function loadVersions() {
  const packageJson = readJson(paths.packageJson)
  const tauriConfig = readJson(paths.tauriConfig)
  const cargoToml = readFileSync(paths.cargoToml, 'utf8')
  const cargoLock = readFileSync(paths.cargoLock, 'utf8')
  const packageDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  const lockPackage = /\[\[package\]\]\s*\r?\nname = "lamp"\s*\r?\nversion = "([^"]+)"/.exec(cargoLock)

  if (!lockPackage) throw new Error('Missing lamp package entry in Cargo.lock')

  return {
    packageJson,
    tauriConfig,
    cargoToml,
    cargoLock,
    packageDependencies,
    app: {
      packageJson: packageJson.version,
      cargoToml: readTomlValue(cargoToml, 'package', 'version'),
      cargoLock: lockPackage[1],
      tauriConfig: tauriConfig.version,
    },
    tauri: {
      api: cleanVersion(packageDependencies['@tauri-apps/api']),
      cli: cleanVersion(packageDependencies['@tauri-apps/cli']),
      core: cleanVersion(readTomlValue(cargoToml, 'dependencies', 'tauri')),
    },
    plugins: {
      dialog: {
        javascript: cleanVersion(packageDependencies['@tauri-apps/plugin-dialog']),
        rust: cleanVersion(readTomlValue(cargoToml, 'dependencies', 'tauri-plugin-dialog')),
      },
      fs: {
        javascript: cleanVersion(packageDependencies['@tauri-apps/plugin-fs']),
        rust: cleanVersion(readTomlValue(cargoToml, 'dependencies', 'tauri-plugin-fs')),
      },
      shell: {
        javascript: cleanVersion(packageDependencies['@tauri-apps/plugin-shell']),
        rust: cleanVersion(readTomlValue(cargoToml, 'dependencies', 'tauri-plugin-shell')),
      },
    },
  }
}

function checkVersions(releaseTag = '') {
  const versions = loadVersions()
  assertEqual('Application', versions.app)

  const appVersion = versions.app.packageJson
  if (!semverPattern.test(appVersion)) throw new Error(`Application version is not valid SemVer: ${appVersion}`)

  const packageManagerMatch = /^pnpm@(\d+\.\d+\.\d+)$/.exec(versions.packageJson.packageManager || '')
  if (!packageManagerMatch) throw new Error('packageManager must pin an exact pnpm version')

  assertEqual('Tauri core major/minor', {
    api: majorMinor(versions.tauri.api),
    cli: majorMinor(versions.tauri.cli),
    rust: majorMinor(versions.tauri.core),
  })

  for (const [name, pluginVersions] of Object.entries(versions.plugins)) {
    assertEqual(`Tauri ${name} plugin`, pluginVersions)
  }

  if (releaseTag && releaseTag !== `v${appVersion}`) {
    throw new Error(`Release tag ${releaseTag} must equal v${appVersion}`)
  }

  console.log(`Lamp application: ${appVersion}`)
  console.log(`Package manager: pnpm ${packageManagerMatch[1]}`)
  console.log(`Tauri core: api ${versions.tauri.api}, cli ${versions.tauri.cli}, rust ${versions.tauri.core}`)
  for (const [name, pluginVersions] of Object.entries(versions.plugins)) {
    console.log(`Tauri ${name} plugin: ${pluginVersions.javascript}`)
  }
  if (releaseTag) console.log(`Release tag: ${releaseTag}`)
}

function setApplicationVersion(version) {
  if (!semverPattern.test(version || '')) {
    throw new Error('Usage: pnpm run version:set -- <semver>')
  }

  const packageJson = readJson(paths.packageJson)
  const tauriConfig = readJson(paths.tauriConfig)
  let packageJsonSource = readFileSync(paths.packageJson, 'utf8')
  let tauriConfigSource = readFileSync(paths.tauriConfig, 'utf8')
  let cargoToml = readFileSync(paths.cargoToml, 'utf8')
  let cargoLock = readFileSync(paths.cargoLock, 'utf8')

  packageJsonSource = replaceJsonVersion(packageJsonSource, packageJson.version, version)
  tauriConfigSource = replaceJsonVersion(tauriConfigSource, tauriConfig.version, version)
  cargoToml = replaceTomlValue(cargoToml, 'package', 'version', version)

  const lockPattern = /(\[\[package\]\]\s*\r?\nname = "lamp"\s*\r?\nversion = ")[^"]+(".*)/
  if (!lockPattern.test(cargoLock)) throw new Error('Missing lamp package entry in Cargo.lock')
  cargoLock = cargoLock.replace(lockPattern, `$1${version}$2`)

  writeFileSync(paths.packageJson, packageJsonSource)
  writeFileSync(paths.tauriConfig, tauriConfigSource)
  writeFileSync(paths.cargoToml, cargoToml)
  writeFileSync(paths.cargoLock, cargoLock)
}

try {
  const [command = 'check', value] = process.argv.slice(2)
  if (command === 'set') {
    setApplicationVersion(value)
    console.log(`Updated Lamp application version to ${value}`)
  } else if (command !== 'check') {
    throw new Error(`Unknown command: ${command}`)
  }

  checkVersions(process.env.RELEASE_TAG || '')
} catch (error) {
  console.error(`Version check failed: ${error.message}`)
  process.exitCode = 1
}
