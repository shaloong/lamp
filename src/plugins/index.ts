// ============================================================
// LAMP Plugin System — PluginHost
// Singleton that orchestrates plugin discovery, loading,
// activation, deactivation, and exposes the event bus and
// contribution registry to the rest of the app.
// ============================================================

import { reactive, readonly } from 'vue';import type { Editor } from '@tiptap/core';
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

// Extend the Window interface to include __lamp_app__
declare global {
  interface Window {
    __lamp_app__?: { i18n?: any };
  }
}

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

// ─── I18n Service ─────────────────────────────────────────────

/**
 * Centralized i18n message registration for plugins.
 * Built-in messages are collected before app.use(i18n).
 * Dynamic (workspace/user) plugins register via ctx.i18n.setLocaleMessages().
 */
class I18nService {
  /**
   * Built-in messages collected before Vue mounts.
   * Structure: { 'zh-CN': { 'plugins.lamp-ai-actions': { polish: '润色' } }, ... }
   */
  private builtinMessages: Record<string, Record<string, Record<string, unknown>>> = {};

  /**
   * Merge built-in messages into i18n before app.use(i18n).
   * Called from main.js before mounting the Vue app.
   */
  /**
   * Merge builtin plugin messages into an i18n instance AFTER it has been created.
   * Storage keys include the namespace prefix (e.g. 'plugins.lamp-ai-actions.ai.polish').
   * We strip that prefix so the remainder ('ai.polish') lands in the correct
   * nesting depth, merging with the existing locale file messages
   * (e.g. { ai: { polish: '...' } }).
   */
  mergeBuiltinMessagesInto(i18nInstance: ReturnType<typeof import('vue-i18n')['createI18n']>): void {
    // vue-i18n v11 Composition API: global.messages is a ComputedRef.
    // Access .value to get the raw messages object, then mutate in place.
    const allMessages = i18nInstance.global.messages.value as Record<string, Record<string, unknown>>;
    if (!allMessages) return;

    for (const [locale, namespaceMap] of Object.entries(this.builtinMessages)) {
      const localeMsgs = allMessages[locale];
      if (!localeMsgs) continue;

      for (const [nsFullKey, flatMessages] of Object.entries(namespaceMap)) {
        // nsFullKey = 'plugins.lamp-ai-actions', stored keys in flatMessages have the prefix
        // e.g. flatMessages = { 'plugins.lamp-ai-actions.bold': '粗体', 'plugins.lamp-ai-actions.italic': '斜体' }
        const nsParts = nsFullKey.split('.'); // ['plugins', 'lamp-ai-actions']

        for (const [fullKey, value] of Object.entries(flatMessages as Record<string, unknown>)) {
          // Skip if the key is exactly the namespace (no remainder = nothing to add)
          if (fullKey === nsFullKey) continue;
          // remainder = key without the namespace prefix, e.g. 'bold' or 'ai.polish'
          const remainder = fullKey.slice(nsFullKey.length + 1);
          const remainderParts = remainder.split('.'); // always non-empty after 'continue' above
          // Full path: namespace parts + remainder parts
          const parts = [...nsParts, ...remainderParts];

          let cur = localeMsgs;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {};
            cur = cur[parts[i]] as Record<string, unknown>;
          }
          cur[parts[parts.length - 1]] = value;
        }
      }
    }
  }

  /**
   * Collect built-in messages (called from builtins/index.ts before Vue mounts).
   * Stored as flat dot-notation keys (e.g. 'plugins.lamp-ai-actions.ai.polish')
   * so mergeBuiltinMessagesInto can place them at the correct path in the root messages object.
   * @param pluginId e.g. 'lamp.ai-actions'
   * @param locale e.g. 'zh-CN'
   * @param messages e.g. { 'ai.polish': '润色', 'ai.polishing': '润色中...' }
   */
  addBuiltinMessages(pluginId: string, locale: string, messages: Record<string, unknown>): void {
    const ns = this._pluginNamespace(pluginId); // e.g. 'plugins.lamp-ai-actions'
    if (!this.builtinMessages[locale]) {
      this.builtinMessages[locale] = {};
    }
    if (!this.builtinMessages[locale][ns]) {
      this.builtinMessages[locale][ns] = {};
    }
    for (const [key, value] of Object.entries(messages)) {
      // key is already the full dot-notation path (e.g. 'ai.polish');
      // prepend namespace to form the storage key.
      const flatKey = `${ns}.${key}`; // e.g. 'plugins.lamp-ai-actions.ai.polish'
      (this.builtinMessages[locale][ns] as Record<string, unknown>)[flatKey] = value;
    }
  }

  /**
   * Register messages for a dynamic plugin (called from ctx.i18n.setLocaleMessages).
   */
  setLocaleMessages(pluginId: string, locale: string, messages: Record<string, unknown>): void {
    const { i18n } = window.__lamp_app__ ?? {};
    if (!i18n) {
      console.warn(`[I18nService] Cannot register messages for plugin "${pluginId}" — app not mounted yet.`);
      return;
    }
    const ns = this._pluginNamespace(pluginId);
    if (!i18n.global.messages[locale]) {
      i18n.global.messages[locale] = {};
    }
    i18n.global.messages[locale][ns] = {
      ...(i18n.global.messages[locale][ns] as Record<string, unknown> || {}),
      ...messages,
    };
  }

  /** Convert plugin id 'lamp.ai-actions' → 'plugins.lamp-ai-actions' */
  private _pluginNamespace(pluginId: string): string {
    return 'plugins.' + pluginId.replace(/\./g, '-');
  }
}

// ─── Shortcut Service ────────────────────────────────────────

export interface ShortcutEntry {
  id: string;
  label: string;
  icon?: string;
  defaultAccelerator?: string;
  effectiveAccelerator?: string;
  pluginId?: string;
}

interface ParsedShortcut {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

class ShortcutService {
  // commandId → full entry (id, label, icon, keybinding)
  private entries = new Map<string, {
    id: string;
    label: string;
    icon?: string;
    keybinding?: string;
  }>();
  // commandId → accelerator string (user override)
  private overrides = new Map<string, string>();
  // commandId → handler
  private handlers = new Map<string, () => void>();
  private listening = false;
  // External register function from useShortcutCenter composable
  private extRegister: ((id: string, acc: string) => void) | null = null;

  constructor() {
    this._load();
  }

  /**
   * Set the external register function from useShortcutCenter composable.
   * When set, ShortcutService will delegate shortcut watching to the composable.
   */
  setExternalRegister(fn: (id: string, acc: string) => void): void {
    this.extRegister = fn;
  }

  /** Register a command with an optional keybinding. Called by CommandService. */
  registerCommand(cmd: {
    id: string;
    label: string;
    keybinding?: string;
    icon?: string;
    handler: () => void | Promise<void>;
  }): void {
    this.entries.set(cmd.id, { id: cmd.id, label: cmd.label, icon: cmd.icon, keybinding: cmd.keybinding });
    if (cmd.keybinding) {
      this.handlers.set(cmd.id, cmd.handler);
      if (this.listening && this.extRegister) {
        this.extRegister(cmd.id, cmd.keybinding);
      }
    }
  }

  /** Remove a command's handler when it is unregistered. */
  unregisterCommand(id: string): void {
    this.entries.delete(id);
    this.overrides.delete(id);
    this.handlers.delete(id);
  }

  /** Start listening. Call AFTER setExternalRegister() and after commands are registered. */
  startListening(): void {
    if (this.listening) return;
    for (const [id, entry] of this.entries) {
      const acc = this.overrides.get(id) ?? entry.keybinding;
      if (acc && this.extRegister) this.extRegister(id, acc);
    }
    this.listening = true;
  }

  /** Stop listening. */
  stopListening(): void {
    this.listening = false;
  }

  /** Get the currently active accelerator for a command (override > default). */
  getEffectiveAccelerator(commandId: string): string | undefined {
    return this.overrides.get(commandId) ?? this.entries.get(commandId)?.keybinding;
  }

  /** Override a command's accelerator. Pass null to remove override. */
  setOverride(commandId: string, accelerator: string | null): void {
    const entry = this.entries.get(commandId);
    if (!entry) return;
    const acc = accelerator ?? entry.keybinding;
    if (this.listening && this.extRegister && acc) {
      this.extRegister(commandId, acc);
    }
    if (accelerator === null) {
      this.overrides.delete(commandId);
    } else {
      this.overrides.set(commandId, accelerator);
    }
    this._persist();
  }

  /** Reset a command to its default accelerator. */
  resetToDefault(commandId: string): void {
    this.overrides.delete(commandId);
    this._persist();
  }

  /** Reset all overrides. */
  resetAll(): void {
    this.overrides.clear();
    this._persist();
  }

  /** Get all shortcuts for the settings UI. */
  getAll(): ShortcutEntry[] {
    return [...this.entries.values()].map(entry => ({
      ...entry,
      defaultAccelerator: entry.keybinding,
      effectiveAccelerator: this.overrides.get(entry.id) ?? entry.keybinding,
    }));
  }

  /** Check if an accelerator conflicts with any existing command. */
  checkConflict(accelerator: string, excludeId?: string): string | null {
    for (const [id, entry] of this.entries) {
      if (id === excludeId) continue;
      const other = this.overrides.get(id) ?? entry.keybinding;
      if (!other) continue;
      if (this._acceleratorsEqual(accelerator, other)) return id;
    }
    return null;
  }

  // ── Private ─────────────────────────────────────────────────

  parseAccelerator(str: string): ParsedShortcut | null {
    if (!str) return null;
    const parts = str.split('+').map(p => p.trim());
    const shortcut: ParsedShortcut = { ctrl: false, meta: false, alt: false, shift: false, key: '' };
    for (const part of parts) {
      const p = part.toLowerCase();
      if (p === 'ctrl' || p === 'control') shortcut.ctrl = true;
      else if (p === 'meta' || p === 'cmd' || p === 'command') shortcut.meta = true;
      else if (p === 'alt' || p === 'option') shortcut.alt = true;
      else if (p === 'shift') shortcut.shift = true;
      else shortcut.key = part;
    }
    if (!shortcut.key) return null;
    return shortcut;
  }

  private _acceleratorsEqual(a: string, b: string): boolean {
    const pa = this.parseAccelerator(a);
    const pb = this.parseAccelerator(b);
    if (!pa || !pb) return false;
    return pa.ctrl === pb.ctrl && pa.alt === pb.alt &&
           pa.shift === pb.shift &&
           pa.key.toLowerCase() === pb.key.toLowerCase();
  }

  private _persist(): void {
    const obj: Record<string, string> = {};
    for (const [k, v] of this.overrides) obj[k] = v;
    localStorage.setItem('lamp:shortcuts:overrides', JSON.stringify(obj));
  }

  private _load(): void {
    try {
      const raw = localStorage.getItem('lamp:shortcuts:overrides');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        for (const [k, v] of Object.entries(parsed)) this.overrides.set(k, v);
      }
    } catch { /* ignore */ }
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
  // commandId → pluginId (for getAll)
  private commandPlugins = new Map<string, string>();

  constructor(
    private shortcutService: ShortcutService,
    private events: EventBus,
  ) {}

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
    this.commandPlugins.set(cmd.id, pluginId);
    // Also register with shortcut service
    this.shortcutService.registerCommand(cmd);
    return () => this.unregister(cmd.id);
  }

  execute(id: string): Promise<void> {
    for (const pluginCmds of this.registry.values()) {
      if (pluginCmds.has(id)) {
        const cmd = pluginCmds.get(id)!;
        // Emit event so App.vue can route commands to menu handlers
        this.events.emit('lamp.command.execute', { id });
        const result = cmd.handler();
        if (result instanceof Promise) return result;
        return Promise.resolve();
      }
    }
    return Promise.reject(new Error(`Command "${id}" not found`));
  }

  getAll() {
    const result: Array<{ id: string; label: string; keybinding?: string; icon?: string; pluginId?: string }> = [];
    for (const [pluginId, pluginCmds] of this.registry.entries()) {
      for (const cmd of pluginCmds.values()) {
        // Use effective accelerator (user override > default)
        const effective = this.shortcutService.getEffectiveAccelerator(cmd.id);
        result.push({ id: cmd.id, label: cmd.label, keybinding: effective ?? cmd.keybinding, icon: cmd.icon, pluginId });
      }
    }
    return result;
  }

  unregister(id: string): void {
    for (const pluginCmds of this.registry.values()) {
      if (pluginCmds.delete(id)) {
        this.commandPlugins.delete(id);
        this.shortcutService.unregisterCommand(id);
        return;
      }
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
  readonly shortcutService = new ShortcutService();
  readonly commandService = new CommandService(this.shortcutService, this.events);

  /** I18n service — for built-in messages collected before Vue mounts */
  readonly i18nService = new I18nService();

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
        const userDir = await window.lampAPI.getUserPluginsDir();
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
      shortcutService: this.shortcutService,
      aiState: this.aiState,
      i18nService: this.i18nService,
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
      shortcutService: this.shortcutService,
      aiState: this.aiState,
      i18nService: this.i18nService,
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
      shortcutService: this.shortcutService,
      aiState: this.aiState,
      i18nService: this.i18nService,
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
