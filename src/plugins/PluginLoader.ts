// ============================================================
// LAMP Plugin System — PluginLoader
// Discovers and loads plugin manifests from the filesystem.
// Used for workspace and user plugins (built-ins are statically imported).
// ============================================================

import type { LampPluginManifest } from './types';

export class PluginLoader {
  /**
   * Scan a directory for plugins (subfolders each containing a manifest.json).
   * Returns all valid plugin manifests found.
   */
  async scanPlugins(dirPath: string): Promise<LampPluginManifest[]> {
    if (!dirPath) return [];
    try {
      const entries: Array<{
        name: string;
        path: string;
        isDirectory: boolean;
      }> = await window.lampAPI.getFolderContent(dirPath);

      const manifests: LampPluginManifest[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory) continue;
        try {
          const manifest = await this.readManifest(entry.path);
          if (manifest) {
            manifests.push(manifest);
          }
        } catch (err) {
          console.warn(`[PluginLoader] Failed to load plugin at "${entry.path}":`, err);
        }
      }
      return manifests;
    } catch (err) {
      // Directory doesn't exist or is inaccessible — not an error
      console.debug(`[PluginLoader] Cannot scan "${dirPath}":`, err);
      return [];
    }
  }

  /**
   * Read and parse a plugin's manifest.json.
   */
  async readManifest(pluginDirPath: string): Promise<LampPluginManifest | null> {
    const manifestPath = this._join(pluginDirPath, 'manifest.json');
    try {
      const content: string = await window.lampAPI.readTextFile(manifestPath);
      const manifest = JSON.parse(content) as LampPluginManifest;

      // Basic validation
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
        console.warn(`[PluginLoader] Plugin at "${pluginDirPath}" is missing required manifest fields (id, name, version, main).`);
        return null;
      }

      return manifest;
    } catch (err) {
      console.warn(`[PluginLoader] No valid manifest.json in "${pluginDirPath}":`, err);
      return null;
    }
  }

  /**
   * Load a plugin's main entry module dynamically.
   * For production, plugins are bundled as ESM files on disk.
   * In development, they are loaded via Vite's dev server or file:// URLs.
   */
  async loadModule(manifest: LampPluginManifest, basePath: string): Promise<unknown> {
    const entryPath = this._join(basePath, manifest.main);
    // Dynamic import works for both HTTP (dev) and file:// (prod) URLs
    return import(/* @vite-ignore */ entryPath);
  }

  private _join(...parts: string[]): string {
    return parts.join('/').replace(/\\/g, '/');
  }
}
