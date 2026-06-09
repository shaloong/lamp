// ============================================================
// LAMP Plugin System — PluginHost
// Singleton that orchestrates plugin discovery, loading,
// activation, deactivation, and exposes the event bus and
// contribution registry to the rest of the app.
// ============================================================

import { reactive, readonly } from 'vue';
import type { Editor } from '@tiptap/core';
import { EventBus } from './EventBus';
import { ContributionRegistry } from './ContributionRegistry';
import { PluginLoader } from './PluginLoader';
import type {
  LampPluginManifest,
  LampPlugin,
  LoadedPlugin,
  PluginScope,
} from './types';
import { PluginContext } from './types';

// Re-export for external consumers
export { EventBus } from './EventBus';
export { ContributionRegistry } from './ContributionRegistry';

// ─── Storage Service ────────────────────────────────────────

class StorageService {
  // In-memory cache, backed by localStorage
  private cache = new Map<string, Map<string, unknown>>();

  constructor() {
    this._loadAll();
  }

  private _loadAll(): void {
    try {
      const raw = localStorage.getItem('lamp:plugins:storage');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
        for (const [pluginId, data] of Object.entries(parsed)) {
          this.cache.set(pluginId, new Map(Object.entries(data)));
        }
      }
    } catch {
      // Ignore
    }
  }

  private _persist(): void {
    const obj: Record<string, Record<string, unknown>> = {};
    for (const [pluginId, data] of this.cache) {
      obj[pluginId] = Object.fromEntries(data);
    }
    localStorage.setItem('lamp:plugins:storage', JSON.stringify(obj));
  }

  get<T>(pluginId: string, key: string, defaultValue?: T): T {
    const pluginData = this.cache.get(pluginId);
    if (pluginData && pluginData.has(key)) {
      return pluginData.get(key) as T;
    }
    return defaultValue as T;
  }

  set<T>(pluginId: string, key: string, value: T): void {
    if (!this.cache.has(pluginId)) {
      this.cache.set(pluginId, new Map());
    }
    this.cache.get(pluginId)!.set(key, value);
    this._persist();
  }

  remove(pluginId: string, key: string): void {
    this.cache.get(pluginId)?.delete(key);
    this._persist();
  }

  keys(pluginId: string): string[] {
    return Array.from(this.cache.get(pluginId)?.keys() ?? []);
  }

  clear(pluginId: string): void {
    this.cache.delete(pluginId);
    this._persist();
  }
}

// ─── Command Service ────────────────────────────────────────

class CommandService {
  // pluginId → command id → command descriptor
  private registry = new Map<string, Map<string, {
    id: string;
    label: string;
    keybinding?: string;
    icon?: string;
    handler: () => void | Promise<void>;
  }>>();

  register(pluginId: string, cmd: {
    id: string;
    label: string;
    keybinding?: string;
    icon?: string;
    handler: () => void | Promise<void>;
  }): () => void {
    if (!this.registry.has(pluginId)) {
      this.registry.set(pluginId, new Map());
    }
    this.registry.get(pluginId)!.set(cmd.id, cmd);
    return () => this.unregister(cmd.id);
  }

  execute(id: string): Promise<void> {
    for (const pluginCmds of this.registry.values()) {
      if (pluginCmds.has(id)) {
        const cmd = pluginCmds.get(id)!;
        const result = cmd.handler();
        if (result instanceof Promise) return result;
        return Promise.resolve();
      }
    }
    return Promise.reject(new Error(`Command "${id}" not found`));
  }

  getAll() {
    const result: Array<{ id: string; label: string; keybinding?: string; icon?: string }> = [];
    for (const pluginCmds of this.registry.values()) {
      for (const cmd of pluginCmds.values()) {
        result.push({ id: cmd.id, label: cmd.label, keybinding: cmd.keybinding, icon: cmd.icon });
      }
    }
    return result;
  }

  unregister(id: string): void {
    for (const pluginCmds of this.registry.values()) {
      if (pluginCmds.delete(id)) return;
    }
  }
}

// ─── PluginHost ─────────────────────────────────────────────

export class PluginHost {
  private _loaded = reactive(new Map<string, LoadedPlugin>());
  private _status = reactive({ phase: 'idle', error: null as string | null });
  private _editorInstance: Editor | null = null;
  private _workspace = reactive({ isOpen: false, rootPath: '', name: '' });
  private readonly _loader = new PluginLoader();

  /** AI operation loading/error state — shared across all AI actions */
  readonly aiState = reactive({
    isLoading: false,
    actionLabel: '',
    error: '' as string | null,
    suggestion: null as AISuggestion | null,
  });

  /** Event bus — available immediately after construction */
  readonly events = new EventBus();

  /** Contribution registry — available immediately after construction */
  readonly contributions = new ContributionRegistry();

  /** Storage service for plugins */
  readonly storageService = new StorageService();

  /** Command service for plugins */
  readonly commandService = new CommandService();

  /** All loaded plugin descriptors (read-only) */
  get plugins() { return readonly(this._loaded); }

  /** Current loading/status phase */
  get status()  { return readonly(this._status); }

  /** All loaded plugin manifests */
  get loadedManifests(): LampPluginManifest[] {
    return Array.from(this._loaded.values()).map(p => p.manifest);
  }

  /** Total count of loaded plugins */
  get pluginCount(): number { return this._loaded.size; }

  /**
   * Register the TipTap editor instance so plugins can access it.
   * Call this from Editor.vue mounted() hook.
   */
  setEditorInstance(editor: Editor | null): void {
    this._editorInstance = editor;
    if (editor) {
      this.events.emit('lamp.editor.ready', {});
    } else {
      this.events.emit('lamp.editor.destroy', {});
    }
  }

  /**
   * Update workspace state (called from workspace store or App.vue).
   * When the workspace changes, workspace plugins are reloaded.
   */
  setWorkspaceState(isOpen: boolean, rootPath: string, name: string): void {
    const wasOpen = this._workspace.isOpen;
    this._workspace.isOpen = isOpen;
    this._workspace.rootPath = rootPath;
    this._workspace.name = name;
    if (isOpen && !wasOpen) {
      this.events.emit('lamp.workspace.opened', { rootPath, name });
      // Reload workspace plugins
      this._deactivateScope('workspace');
      this.startDynamic();
    } else if (!isOpen && wasOpen) {
      this._deactivateScope('workspace');
      this.events.emit('lamp.workspace.closed', {});
    }
  }

  private _deactivateScope(scope: PluginScope): void {
    for (const [id, loaded] of [...this._loaded.entries()]) {
      if (loaded.scope === scope) {
        this.deactivate(id);
      }
    }
  }

  /**
   * Start the plugin system — activates all built-in plugins synchronously.
   * Dynamic (user/workspace) plugin loading is deferred to startDynamic().
   * Call this BEFORE app.mount() so contributions are registered before
   * components that consume them (e.g. Editor.vue) are mounted.
   */
  start(): void {
    this._status.phase = 'discovering';
    try {
      // 1. Built-in plugins (all synchronous — static imports)
      const builtinManifests = this._loadBuiltinManifests();
      this._activateAllSync(builtinManifests, 'builtin');

      this._status.phase = 'ready';
      this.events.emit('lamp.plugins.ready', { count: this._loaded.size });
      console.log(`[PluginHost] Ready. Loaded ${this._loaded.size} built-in plugin(s).`);
    } catch (err) {
      this._status.phase = 'error';
      this._status.error = String(err);
      console.error('[PluginHost] Failed to start plugins:', err);
    }
  }

  /**
   * Load and activate dynamic plugins (workspace + user plugins).
   * Called after the app is mounted and the workspace is known.
   */
  async startDynamic(): Promise<void> {
    try {
      // 1. Workspace plugins: <workspace-root>/.lamp/plugins/
      if (this._workspace.isOpen && this._workspace.rootPath) {
        const wsDir = this._join(this._workspace.rootPath, '.lamp', 'plugins');
        const wsManifests = await this._loader.scanPlugins(wsDir);
        await this._activateAllDynamic(wsManifests, wsDir, 'workspace');
      }

      // 2. User plugins: ~/.lamp/plugins/
      try {
        const userDir = await window.electronAPI.getUserPluginsDir();
        const userManifests = await this._loader.scanPlugins(userDir);
        await this._activateAllDynamic(userManifests, userDir, 'user');
      } catch (err) {
        console.debug('[PluginHost] Could not load user plugins:', err);
      }

      console.log(`[PluginHost] Dynamic loading done. Total plugins: ${this._loaded.size}`);
    } catch (err) {
      console.error('[PluginHost] startDynamic failed:', err);
    }
  }

  private async _activateAllDynamic(
    manifests: LampPluginManifest[],
    basePath: string,
    scope: PluginScope
  ): Promise<void> {
    for (const manifest of manifests) {
      try {
        await this._activateDynamic(manifest, basePath, scope);
      } catch (err) {
        console.error(`[PluginHost] Failed to activate dynamic plugin "${manifest.id}" (${scope}):`, err);
      }
    }
  }

  private async _activateDynamic(
    manifest: LampPluginManifest,
    basePath: string,
    scope: PluginScope
  ): Promise<void> {
    if (this._loaded.has(manifest.id)) return;

    const ctx = new PluginContext(manifest, {
      events: this.events,
      contributions: this.contributions,
      editorInstance: this._editorInstance,
      workspace: this._workspace,
      storageService: this.storageService,
      commandService: this.commandService,
      aiState: this.aiState,
    });

    const module = await this._loader.loadModule(manifest, basePath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin: LampPlugin = ('default' in module) ? (module as any).default : (module as any);

    const { onLoad, onActivate, onDeactivate } = plugin;
    void onDeactivate;

    if (onLoad) {
      const contribs = onLoad(ctx);
      if (contribs) this.contributions.register(manifest.id, contribs);
    }

    if (onActivate) {
      await onActivate(ctx);
    }

    this._loaded.set(manifest.id, { manifest, scope, plugin, ctx });
    this.events.emit('lamp.plugin.activated', { id: manifest.id, scope });
    console.log(`[PluginHost] Activated dynamic plugin: ${manifest.id} v${manifest.version} (${scope})`);
  }

  private _join(...parts: string[]): string {
    return parts.join('/').replace(/\\/g, '/');
  }

  /**
   * Activate a single plugin by manifest.
   */
  async activate(manifest: LampPluginManifest, scope: PluginScope): Promise<void> {
    if (this._loaded.has(manifest.id)) {
      console.warn(`[PluginHost] Plugin "${manifest.id}" is already loaded.`);
      return;
    }

    // Capability check
    if (manifest.capabilities) {
      const missing = this._checkCapabilities(manifest.capabilities);
      if (missing.length > 0) {
        console.warn(`[PluginHost] Plugin "${manifest.id}" missing capabilities: ${missing.join(', ')}. Skipping.`);
        return;
      }
    }

    // Create per-plugin context (the lamp.* API)
    const ctx = new PluginContext(manifest, {
      events: this.events,
      contributions: this.contributions,
      editorInstance: this._editorInstance,
      workspace: this._workspace,
      storageService: this.storageService,
      commandService: this.commandService,
      aiState: this.aiState,
    });

    // Activate dependencies first
    if (manifest.dependencies) {
      for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
        const dep = this._loaded.get(depId);
        if (!dep) {
          console.warn(`[PluginHost] Plugin "${manifest.id}" requires "${depId}" (${depVersion}) which is not loaded.`);
        }
      }
    }

    // Load the plugin module
    let plugin: LampPlugin;
    if (manifest.builtin) {
      // Built-ins are loaded via the manifests registry
      plugin = this._builtinModules.get(manifest.id) as LampPlugin;
      if (!plugin) {
        console.error(`[PluginHost] Built-in plugin "${manifest.id}" not found in _builtinModules.`);
        return;
      }
    } else {
      console.warn(`[PluginHost] Dynamic plugin loading not yet implemented for "${manifest.id}".`);
      return;
    }

    // Phase 1: onLoad — register contributions (synchronous)
    const { onLoad, onActivate, onDeactivate, ...rest } = plugin;
    if (onLoad) {
      const contribs = onLoad(ctx);
      if (contribs) {
        this.contributions.register(manifest.id, contribs);
      }
    }

    // Phase 2: onActivate — async startup
    if (onActivate) {
      try {
        await onActivate(ctx);
      } catch (err) {
        console.error(`[PluginHost] onActivate failed for "${manifest.id}":`, err);
      }
    }

    // Track
    this._loaded.set(manifest.id, { manifest, scope, plugin, ctx });
    this.events.emit('lamp.plugin.activated', { id: manifest.id, scope });
    console.log(`[PluginHost] Activated plugin: ${manifest.id} v${manifest.version} (${scope})`);
  }

  /**
   * Deactivate a plugin by id.
   */
  async deactivate(pluginId: string): Promise<void> {
    const loaded = this._loaded.get(pluginId);
    if (!loaded) return;
    const { plugin } = loaded;
    try {
      if (plugin.onDeactivate) {
        await plugin.onDeactivate();
      }
    } catch (err) {
      console.error(`[PluginHost] onDeactivate failed for "${pluginId}":`, err);
    }
    this.contributions.unregister(pluginId);
    this._loaded.delete(pluginId);
    this.events.emit('lamp.plugin.deactivated', { id: pluginId });
  }

  /**
   * Reload a single plugin (useful during development).
   */
  async reload(pluginId: string): Promise<void> {
    const was = this._loaded.get(pluginId);
    if (!was) return;
    await this.deactivate(pluginId);
    await this.activate(was.manifest, was.scope);
  }

  /**
   * Get a plugin's context by id.
   */
  getContext(pluginId: string) {
    return this._loaded.get(pluginId)?.ctx ?? null;
  }

  // ─── Built-in plugin registry ─────────────────────────────

  // Subclass or external module registers built-ins here
  private _builtinModules = new Map<string, LampPlugin>();

  /**
   * Register a built-in plugin module. Called by builtins/index.ts.
   */
  registerBuiltin(id: string, module: LampPlugin): void {
    this._builtinModules.set(id, module);
  }

  private _loadBuiltinManifests(): LampPluginManifest[] {
    // Import from the auto-generated builtins manifest registry
    // This will be populated by src/builtins/manifests.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manifests: LampPluginManifest[] = [];
    for (const [id, mod] of this._builtinModules) {
      // Extract manifest from the module's manifest property if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = (mod as any).manifest as LampPluginManifest | undefined;
      if (m) manifests.push({ ...m, id, builtin: true });
    }
    return manifests;
  }

  private _activateAllSync(
    manifests: LampPluginManifest[],
    scope: PluginScope
  ): void {
    for (const manifest of manifests) {
      try {
        this._activateSync(manifest, scope);
      } catch (err) {
        console.error(`[PluginHost] Failed to activate "${manifest.id}" (${scope}):`, err);
      }
    }
  }

  /**
   * Synchronous activation for built-in plugins.
   * Calls onLoad (sync) but NOT onActivate (which may be async).
   * onActivate is deferred to an async phase.
   */
  private _activateSync(manifest: LampPluginManifest, scope: PluginScope): void {
    if (this._loaded.has(manifest.id)) return;

    if (manifest.capabilities) {
      const missing = this._checkCapabilities(manifest.capabilities);
      if (missing.length > 0) {
        console.warn(`[PluginHost] Plugin "${manifest.id}" missing capabilities: ${missing.join(', ')}. Skipping.`);
        return;
      }
    }

    const ctx = new PluginContext(manifest, {
      events: this.events,
      contributions: this.contributions,
      editorInstance: this._editorInstance,
      workspace: this._workspace,
      storageService: this.storageService,
      commandService: this.commandService,
      aiState: this.aiState,
    });

    const plugin = this._builtinModules.get(manifest.id) as LampPlugin | undefined;
    if (!plugin) {
      console.error(`[PluginHost] Built-in plugin "${manifest.id}" not found in _builtinModules.`);
      return;
    }

    const { onLoad, onActivate, onDeactivate, ...rest } = plugin;
    void rest; // ignore

    // Phase 1: onLoad — sync registration
    if (onLoad) {
      const contribs = onLoad(ctx);
      if (contribs) {
        this.contributions.register(manifest.id, contribs);
      }
    }

    // Phase 2: onActivate — deferred (async), not called here
    // It will be awaited separately

    this._loaded.set(manifest.id, { manifest, scope, plugin, ctx });
    this.events.emit('lamp.plugin.activated', { id: manifest.id, scope });
    console.log(`[PluginHost] Activated plugin: ${manifest.id} v${manifest.version} (${scope})`);
  }

  private async _activateAll(
    manifests: LampPluginManifest[],
    scope: PluginScope
  ): Promise<void> {
    for (const manifest of manifests) {
      try {
        await this.activate(manifest, scope);
      } catch (err) {
        console.error(`[PluginHost] Failed to activate "${manifest.id}" (${scope}):`, err);
      }
    }
  }

  private _checkCapabilities(requested: string[]): string[] {
    // In a full implementation, this would check against available capabilities.
    // For now, we allow all.
    return [];
  }
}

// ─── Singleton export ──────────────────────────────────────

export const pluginHost = reactive(new PluginHost()) as ReturnType<typeof reactive> & PluginHost;
