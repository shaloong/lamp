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
import { PluginContext } from './PluginContext';
import { PluginI18nService } from './PluginI18nService';
import type {
  AISuggestion,
  LampPluginManifest,
  LampPlugin,
  LoadedPlugin,
  PluginScope,
} from './types';
import { requireLampAPI } from '../lib/lampApi';

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
  private extRegister: ((id: string, acc: string) => (() => void)) | null = null;
  private registrations = new Map<string, () => void>();

  constructor() {
    this._load();
  }

  /**
   * Set the external register function from useShortcutCenter composable.
   * When set, ShortcutService will delegate shortcut watching to the composable.
   */
  setExternalRegister(fn: (id: string, acc: string) => (() => void)): void {
    for (const dispose of this.registrations.values()) dispose();
    this.registrations.clear();
    this.extRegister = fn;
    if (this.listening) {
      for (const id of this.entries.keys()) this.refreshRegistration(id);
    }
  }

  private refreshRegistration(id: string): void {
    this.registrations.get(id)?.();
    this.registrations.delete(id);
    const accelerator = this.getEffectiveAccelerator(id);
    if (this.listening && this.extRegister && accelerator) {
      this.registrations.set(id, this.extRegister(id, accelerator));
    }
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
    }
    this.refreshRegistration(cmd.id);
  }

  /** Remove a command's handler when it is unregistered. */
  unregisterCommand(id: string): void {
    this.registrations.get(id)?.();
    this.registrations.delete(id);
    this.entries.delete(id);
    this.handlers.delete(id);
  }

  /** Start listening. Call AFTER setExternalRegister() and after commands are registered. */
  startListening(): void {
    if (this.listening) return;
    this.listening = true;
    for (const id of this.entries.keys()) this.refreshRegistration(id);
  }

  /** Stop listening. */
  stopListening(): void {
    this.listening = false;
    for (const dispose of this.registrations.values()) dispose();
    this.registrations.clear();
  }

  /** Get the currently active accelerator for a command (override > default). */
  getEffectiveAccelerator(commandId: string): string | undefined {
    return this.overrides.get(commandId) ?? this.entries.get(commandId)?.keybinding;
  }

  /** Override a command's accelerator. Pass null to remove override. */
  setOverride(commandId: string, accelerator: string | null): void {
    const entry = this.entries.get(commandId);
    if (!entry) return;
    if (accelerator === null) {
      this.overrides.delete(commandId);
    } else {
      this.overrides.set(commandId, accelerator);
    }
    this.refreshRegistration(commandId);
    this._persist();
  }

  /** Reset a command to its default accelerator. */
  resetToDefault(commandId: string): void {
    this.overrides.delete(commandId);
    this.refreshRegistration(commandId);
    this._persist();
  }

  /** Reset all overrides. */
  resetAll(): void {
    this.overrides.clear();
    for (const id of this.entries.keys()) this.refreshRegistration(id);
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
    if (this.commandPlugins.has(cmd.id)) {
      throw new Error(`Command "${cmd.id}" is already registered`);
    }
    if (!this.registry.has(pluginId)) {
      this.registry.set(pluginId, new Map());
    }
    this.registry.get(pluginId)!.set(cmd.id, cmd);
    this.commandPlugins.set(cmd.id, pluginId);
    // Also register with shortcut service
    this.shortcutService.registerCommand(cmd);
    return () => {
      if (this.registry.get(pluginId)?.get(cmd.id) === cmd) {
        this.unregisterOwned(pluginId, cmd.id);
      }
    };
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

  unregisterOwned(pluginId: string, id: string): void {
    if (this.commandPlugins.get(id) === pluginId) this.unregister(id);
  }

  unregisterPlugin(pluginId: string): void {
    for (const id of this.registry.get(pluginId)?.keys() ?? []) {
      this.unregisterOwned(pluginId, id);
    }
    this.registry.delete(pluginId);
  }
}

// ─── PluginHost ─────────────────────────────────────────────

export class PluginHost {
  private _loaded = reactive(new Map<string, LoadedPlugin>());
  private _status = reactive({ phase: 'idle', error: null as string | null });
  private _editorInstance: Editor | null = null;
  private _workspace = reactive({ isOpen: false, rootPath: '', name: '' });
  private _queue: Promise<void> = Promise.resolve();
  private _startPromise: Promise<void> | null = null;
  private _builtinModules = new Map<string, LampPlugin>();
  private _loadErrors = new Map<string, unknown>();

  constructor(private readonly _loader: Pick<PluginLoader, 'scanPlugins' | 'loadModule' | 'readManifest'> = new PluginLoader()) {}

  readonly aiState = reactive({
    isLoading: false,
    actionLabel: '',
    error: null as string | null,
    suggestion: null as AISuggestion | null,
  });
  readonly events = new EventBus();
  readonly contributions = new ContributionRegistry();
  readonly storageService = new StorageService();
  readonly shortcutService = new ShortcutService();
  readonly commandService = new CommandService(this.shortcutService, this.events);
  readonly i18nService = new PluginI18nService();

  get plugins() { return readonly(this._loaded); }
  get status() { return readonly(this._status); }
  get loadedManifests(): LampPluginManifest[] {
    return Array.from(this._loaded.values()).map(plugin => plugin.manifest);
  }
  get pluginCount(): number { return this._loaded.size; }

  setEditorInstance(editor: Editor | null): void {
    this._editorInstance = editor;
    this.events.emit(editor ? 'lamp.editor.ready' : 'lamp.editor.destroy', {});
  }

  // Serialize lifecycle changes so discovery cannot reactivate a closed workspace.
  private _enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this._queue.then(operation);
    this._queue = next.catch(() => undefined);
    return next;
  }

  start(): Promise<void> {
    if (this._startPromise) return this._startPromise;
    this._status.phase = 'discovering';
    const prepared: LoadedPlugin[] = [];
    for (const [id, plugin] of this._builtinModules) {
      const manifest = (plugin as LampPlugin & { manifest?: LampPluginManifest }).manifest;
      if (!manifest || this._loaded.has(id)) continue;
      try {
        prepared.push(this._prepare({ ...manifest, id, builtin: true }, 'builtin', plugin, plugin));
      } catch (error) {
        this._recordError(id, error);
      }
    }

    // onLoad above must finish before Vue mounts; async activation follows once.
    this._startPromise = this._enqueue(async () => {
      for (const loaded of prepared) {
        try {
          await this._finishActivation(loaded);
        } catch (error) {
          this._recordError(loaded.manifest.id, error);
        }
      }
      this._status.phase = this._status.error ? 'error' : 'ready';
      this.events.emit('lamp.plugins.ready', { count: this._loaded.size });
    });
    return this._startPromise;
  }

  setWorkspaceState(isOpen: boolean, rootPath: string, name: string): Promise<void> {
    return this._enqueue(async () => {
      const previous = { ...this._workspace };
      const changed = previous.isOpen !== isOpen || previous.rootPath !== rootPath;
      if (changed && previous.isOpen) {
        for (const loaded of this._loaded.values()) {
          if (loaded.scope === 'workspace') await this._cleanup(loaded);
        }
        this.events.emit('lamp.workspace.closed', { rootPath: previous.rootPath });
      }
      Object.assign(this._workspace, { isOpen, rootPath, name });
      if (changed && isOpen) {
        this.events.emit('lamp.workspace.opened', { rootPath, name });
        await this._scanDirectory(this._join(rootPath, '.lamp', 'plugins'), 'workspace');
      }
    });
  }

  startDynamic(): Promise<void> {
    return this._enqueue(async () => {
      if (this._workspace.isOpen && this._workspace.rootPath) {
        await this._scanDirectory(this._join(this._workspace.rootPath, '.lamp', 'plugins'), 'workspace');
      }
      const userDir = await requireLampAPI('user plugin discovery').getUserPluginsDir();
      await this._scanDirectory(userDir, 'user');
    });
  }

  private async _scanDirectory(directory: string, scope: PluginScope): Promise<void> {
    const manifests = await this._loader.scanPlugins(directory);
    for (const manifest of manifests) {
      try {
        await this._activate(manifest, scope);
      } catch (error) {
        this._recordError(manifest.id, error);
      }
    }
  }

  activate(manifest: LampPluginManifest, scope: PluginScope): Promise<void> {
    return this._enqueue(() => this._activate(manifest, scope));
  }

  private async _activate(manifest: LampPluginManifest, scope: PluginScope, reload = false): Promise<void> {
    if (this._loaded.has(manifest.id)) return;
    let module: unknown;
    if (scope === 'builtin') {
      module = this._builtinModules.get(manifest.id);
      if (!module) throw new Error(`Built-in plugin "${manifest.id}" is not registered`);
    } else {
      if (!manifest.pluginRoot) throw new Error(`Plugin "${manifest.id}" has no root directory`);
      module = await this._loader.loadModule(manifest, manifest.pluginRoot, { reload });
    }
    const exports = module as { default?: LampPlugin };
    const plugin = exports?.default ?? module as LampPlugin;
    if (!plugin || typeof plugin !== 'object') {
      throw new Error(`Plugin "${manifest.id}" must export a plugin object`);
    }
    const loaded = this._prepare(manifest, scope, plugin, module);
    await this._finishActivation(loaded);
  }

  private _prepare(manifest: LampPluginManifest, scope: PluginScope, plugin: LampPlugin, module: unknown): LoadedPlugin {
    const getEditorInstance = () => this._editorInstance;
    const ctx = new PluginContext(manifest, {
      events: this.events,
      contributions: this.contributions,
      get editorInstance() { return getEditorInstance(); },
      workspace: this._workspace,
      storageService: this.storageService,
      commandService: this.commandService,
      shortcutService: this.shortcutService,
      aiState: this.aiState,
      i18nService: this.i18nService,
    });
    const loaded = { manifest, scope, plugin, ctx };
    this._loaded.set(manifest.id, loaded);
    try {
      this.i18nService.removePluginMessages(manifest.id);
      this._registerModuleMessages(manifest.id, module, plugin);
      const contributions = plugin.onLoad?.(ctx);
      if (contributions && typeof (contributions as unknown as { then?: unknown }).then === 'function') {
        void Promise.resolve(contributions).catch(() => undefined);
        throw new Error('onLoad must be synchronous');
      }
      if (contributions) this.contributions.register(manifest.id, contributions);
    } catch (error) {
      this._loadErrors.set(manifest.id, error);
    }
    return loaded;
  }

  private async _finishActivation(loaded: LoadedPlugin): Promise<void> {
    const id = loaded.manifest.id;
    try {
      if (this._loadErrors.has(id)) throw this._loadErrors.get(id);
      await loaded.plugin.onActivate?.(loaded.ctx);
      this.events.emit('lamp.plugin.activated', { id, scope: loaded.scope });
    } catch (error) {
      await this._cleanup(loaded);
      throw error;
    }
  }

  deactivate(pluginId: string): Promise<void> {
    return this._enqueue(async () => {
      const loaded = this._loaded.get(pluginId);
      if (loaded) await this._cleanup(loaded);
    });
  }

  private async _cleanup(loaded: LoadedPlugin): Promise<void> {
    const id = loaded.manifest.id;
    const ctx = loaded.ctx as PluginContext;
    ctx.abort();
    try {
      await loaded.plugin.onDeactivate?.();
    } catch (error) {
      console.error(`[PluginHost] Cleanup failed for "${id}":`, error);
    } finally {
      await ctx.dispose();
      this.commandService.unregisterPlugin(id);
      this.contributions.unregister(id);
      this.i18nService.removePluginMessages(id);
      this._loadErrors.delete(id);
      this._loaded.delete(id);
      this.events.emit('lamp.plugin.deactivated', { id });
    }
  }

  reload(pluginId: string): Promise<void> {
    return this._enqueue(async () => {
      const loaded = this._loaded.get(pluginId);
      if (!loaded) return;
      let manifest = loaded.manifest;
      if (loaded.scope !== 'builtin') {
        if (!manifest.pluginRoot) throw new Error('External plugin has no root directory');
        const refreshed = await this._loader.readManifest(manifest.pluginRoot);
        if (!refreshed || refreshed.id !== pluginId) throw new Error('Reload requires a valid manifest with the same plugin ID');
        manifest = refreshed;
      }
      await this._cleanup(loaded);
      await this._activate(manifest, loaded.scope, true);
    });
  }

  getContext(pluginId: string) {
    return this._loaded.get(pluginId)?.ctx ?? null;
  }

  registerBuiltin(id: string, module: LampPlugin): void {
    this._builtinModules.set(id, module);
    this._registerModuleMessages(id, module);
  }

  private _recordError(id: string, error: unknown): void {
    this._status.error = `${id}: ${String(error)}`;
    console.error(`[PluginHost] Failed to activate "${id}":`, error);
  }

  private _join(...parts: string[]): string {
    return parts.join('/').replace(/\\/g, '/');
  }

  private _registerModuleMessages(pluginId: string, module: unknown, plugin?: LampPlugin): void {
    const exports = module as { messages?: Record<string, Record<string, unknown>>; default?: LampPlugin };
    const messages = plugin?.messages ?? exports.messages ?? exports.default?.messages;
    if (messages) this.i18nService.setAllLocaleMessages(pluginId, messages);
  }
}

export const pluginHost = reactive(new PluginHost()) as ReturnType<typeof reactive> & PluginHost;
