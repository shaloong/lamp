// ============================================================
// LAMP Plugin System — Type Definitions
// Single source of truth for all plugin-related types
// ============================================================

import type { Editor } from '@tiptap/core';
import { requireLampAPI } from '../lib/lampApi';

// ─── Manifest ───────────────────────────────────────────────

export interface LampPluginManifest {
  /** Globally unique identifier, e.g. "lamp.ai-actions" or "acme.thesaurus" */
  id: string;
  /** Human-readable name shown in the plugin manager UI */
  name: string;
  /** Semantic version string, e.g. "1.2.0" */
  version: string;
  /** Path to the plugin's main entry point, relative to the manifest file */
  main: string;
  /**
   * Internal host metadata: absolute plugin root directory used to resolve
   * relative plugin assets (e.g. theme stylesheets).
   */
  pluginRoot?: string;
  /** Optional longer description */
  description?: string;
  /** Display name of the plugin author */
  author?: string;
  /** URL to the plugin's homepage or repository */
  homepage?: string;
  /** Whether this plugin is built-in (default: false) */
  builtin?: boolean;
  /**
   * Whether this plugin can be disabled by the user.
   * Built-in core plugins (e.g. toolbar) should set this to false.
   * Defaults to true.
   */
  disableable?: boolean;
  /**
   * Capabilities / permissions this plugin requests.
   * The host will skip activating the plugin if a requested capability
   * is not available in the current context.
   */
  capabilities?: PluginCapability[];
  /**
   * Contribution points — things this plugin contributes to the host UI.
   * These are registered with the ContributionRegistry during onLoad.
   */
  contributes?: PluginContributions;
  /**
   * Dependencies on other plugins. The host will activate dependencies first.
   * Format: { "other-plugin-id": "^1.0.0" }  (semver range)
   */
  dependencies?: Record<string, string>;
}

// ─── Capabilities ────────────────────────────────────────────

export type PluginCapability =
  | 'editor:read'      // Read-only access to editor content/selection
  | 'editor:write'     // Insert/replace editor content
  | 'editor:format'    // Apply formatting (bold, italic, etc.)
  | 'file:read'        // Read files via lamp.file.*
  | 'file:write'       // Write/save files
  | 'workspace:read'   // Read workspace path/name
  | 'workspace:write'  // Modify workspace settings
  | 'ai:chat'          // Use lamp.ai.* for AI chat
  | 'storage:write'    // Persist plugin-specific data
  | 'commands:register' // Register named commands
  | 'ui:sidebar'       // Contribute sidebar panels
  | 'ui:toolbar'       // Contribute toolbar/editor buttons
  | 'ui:bubble'        // Contribute bubble menu items
  | 'ui:menu'          // Contribute menu bar items
  | 'ui:statusbar'     // Contribute status bar items
  | 'theme:apply'      // Apply CSS custom properties / theme tokens
  | 'event:emit'       // Emit custom events on the event bus
  | 'event:subscribe'; // Subscribe to events on the event bus

// ─── Plugin Lifecycle ────────────────────────────────────────

export interface LampPlugin {
  onLoad?(ctx: PluginContext): PluginContributions | void;
  onActivate?(ctx: PluginContext): Promise<void> | void;
  onDeactivate?(): Promise<void> | void;
}

// ─── Contribution Points ────────────────────────────────────

export interface PluginContributions {
  /** Toolbar buttons added to the editor formatting toolbar */
  editorToolbar?: EditorToolbarItem[];

  /** Items in the text-selection bubble menu */
  bubbleMenu?: BubbleMenuItem[];

  /** Top-level menu bar items */
  menuItems?: MenuItem[];

  /** Sidebar panel contributions */
  sidebarPanels?: SidebarPanelContribution[];

  /** Status bar items */
  statusBarItems?: StatusBarItem[];

  /** AI-powered actions shown in the bubble menu or command palette */
  aiActions?: AIActionContribution[];

  /** File-type handlers — file extensions this plugin handles for preview/export */
  fileHandlers?: FileHandlerContribution[];

  /** Themes provided by this plugin */
  themes?: ThemeContribution[];

  /** TipTap extensions — registered via lamp.editor.registerTipTapExtension() */
  tipTapExtensions?: TipTapExtensionDefinition[];

  /** Settings sections and items contributed by this plugin */
  settings?: PluginSettingsSection[];
}

/**
 * A settings section contributed by a plugin.
 * Appears as a top-level tab (if priority > built-in tabs) or grouped under a label.
 */
export interface PluginSettingsSection {
  /** Unique id within the plugin, e.g. "prompts" */
  id: string;
  /** i18n key or plain string for the section label */
  label: string;
  /** Priority for ordering (higher = earlier). Built-in tabs are priority 100. */
  priority?: number;
  /** Setting items in this section */
  items: PluginSettingsItem[];
}

/** A single setting item within a plugin's settings section */
export interface PluginSettingsItem {
  /** Unique id within the plugin */
  id: string;
  /** i18n key or plain string for the label */
  label: string;
  /** i18n key or plain string for the description */
  description?: string;
  /** Item type determines the rendered control */
  type: 'text' | 'textarea' | 'select' | 'toggle' | 'component';
  /** Default value when no saved value exists */
  defaultValue?: unknown;
  /** Current value — read from ctx.storage; set automatically by the host */
  value?: unknown;
  /** For type="select": array of options */
  options?: Array<{ value: string; label: string }>;
  /** For type="component": path to a Vue 3 SFC relative to plugin root */
  component?: string;
  /**
   * Called when the user changes the value.
   * Receives the new value; persists it via ctx.storage automatically unless you override.
   */
  onChange?: (value: unknown) => void | Promise<void>;
  /**
   * Override the default storage behavior. If true, onChange is responsible for persistence.
   * Default: false (host auto-saves to ctx.storage).
   */
  manualPersist?: boolean;
}

export interface EditorToolbarItem {
  id: string;
  label: string;
  icon?: string; // Lucide icon component name e.g. "Bold"
  /** Supply a Vue component for custom rendering */
  component?: string; // path relative to plugin root
  /** Shortcut displayed next to the label */
  keybinding?: string;
  /** "button" | "dropdown". Default "button" */
  type?: 'button' | 'dropdown';
  /**
   * Child items shown in the dropdown menu. Only used when type === "dropdown".
   * Each child has its own action (applied when selected), label, and icon.
   * The parent's icon/label reflect the currently active child (via isActive check).
   */
  children?: DropdownItem[];
  /** Called when the button is clicked — receives the TipTap editor instance directly */
  action(editor: Editor): void;
  /** Whether the button is highlighted (active state). Evaluated on each selection change. */
  isActive?(editor: Editor): boolean;
  /** Whether the button is disabled */
  isDisabled?(editor: Editor): boolean;
  /** Grouping — items with the same group are separated by a divider */
  group?: string;
  /** Priority for ordering (higher = earlier). Default 50. */
  priority?: number;
}

/** A single option inside a toolbar dropdown menu */
export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  /** Shortcut displayed next to the label */
  keybinding?: string;
  /** Called when this dropdown item is selected */
  action(editor: Editor): void;
  /** Highlight this child as active */
  isActive?(editor: Editor): boolean;
}

export interface BubbleMenuItem {
  id: string;
  label: string;
  icon?: string;
  /** Priority for ordering (higher = earlier). Default 50. */
  priority?: number;
  /** Only show when editor has a non-empty selection */
  requireSelection?: boolean;
  /** Called when the item is clicked — receives TipTap editor instance directly */
  action(editor: Editor): Promise<void> | void;
}

export interface MenuItem {
  id: string;
  /** "file" | "edit" | "view" | "settings" | string (plugin-defined submenu id) */
  where: string;
  label: string;
  icon?: string;
  accelerator?: string;
  separatorBefore?: boolean;
  /** Called when the item is clicked — receives TipTap editor instance directly */
  action(editor: Editor): void;
  /** Priority for ordering within the same 'where' group. Default 50. */
  priority?: number;
}

export interface SidebarPanelContribution {
  id: string;
  title: string;
  icon?: string; // Lucide icon component name
  /** Path to a Vue 3 SFC, relative to plugin root */
  component: string;
  /** Z-order when multiple panels are open (default 0) */
  priority?: number;
}

export interface StatusBarItem {
  id: string;
  /** "left" | "right" — side of the status bar */
  side?: 'left' | 'right';
  /** Priority for ordering (higher = earlier within the side). Default 50. */
  priority?: number;
  /** Text or HTML content */
  text?: string;
  /** Path to a Vue component rendered in the status bar */
  component?: string;
  tooltip?: string;
  action?(ctx: PluginContext): void;
}

export interface AIActionContribution {
  id: string;
  /** i18n key for the label, e.g. "ai.polish". Resolved at render time. */
  label: string;
  /** i18n key for the in-progress label shown while loading, e.g. "ai.polishing" */
  loadingLabel?: string;
  description?: string;
  icon?: string;
  /** The AI prompt template. `{selection}` is replaced with the selected text. */
  promptTemplate: string;
  /** "replace" | "append" — how to insert the result */
  insertMode: 'replace' | 'append';
  /** Priority for ordering in the bubble menu */
  priority?: number;
}

export interface FileHandlerContribution {
  id: string;
  /** File extensions this handler claims, e.g. [".md", ".markdown"] */
  extensions: string[];
  /** Path to a Vue component that previews the file */
  previewComponent?: string;
  /** Icon for the file type */
  icon?: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  /** Path to a CSS or SCSS file, relative to plugin root */
  stylesheet?: string;
  /** CSS custom properties (theme tokens) */
  tokens?: Record<string, string>;
}

export interface TipTapExtensionDefinition {
  name: string;
  /**
   * Supports either:
   * 1) Extension instance returned by Extension.create(...)
   * 2) Constructor that returns an Extension instance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ExtensionClass: import('@tiptap/core').Extension | (new (options?: Record<string, any>) => import('@tiptap/core').Extension);
}

// ─── Host API Namespaces ────────────────────────────────────

export interface LampHostAPI {
  readonly id: string;       // The calling plugin's id (for storage namespacing)
  readonly version: string;   // Host API version for compatibility checks
  editor: LampEditorAPI;
  file: LampFileAPI;
  workspace: LampWorkspaceAPI;
  ai: LampAIAPI;
  ui: LampUIAPI;
  commands: LampCommandsAPI;
  storage: LampStorageAPI;
  event: LampEventAPI;
  i18n: LampI18nAPI;
}

export interface LampEditorAPI {
  getSelection(): string;
  getContent(): string;
  getText(): string;
  insertContent(html: string): void;
  insertContentAtCursor(html: string): void;
  deleteSelection(): void;
  applyMark(mark: string, attributes?: Record<string, unknown>): void;
  removeMark(mark: string): void;
  isActive(name: string, attrs?: Record<string, unknown>): boolean;
  setTextAlign(alignment: 'left' | 'center' | 'right' | 'justify'): void;
  undo(): void;
  redo(): void;
  registerTipTapExtension(def: TipTapExtensionDefinition): void;
  getRawEditor(): Editor | null;
}

export interface LampFileAPI {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  delete(filePath: string): Promise<void>;
  getFolderContent(folderPath: string): Promise<FileInfo[]>;
  watch(folderPath: string): Promise<void>;
  unwatch(): Promise<void>;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileInfo[];
}

export interface LampWorkspaceAPI {
  readonly isOpen: boolean;
  readonly rootPath: string;
  readonly name: string;
  open(): Promise<void>;
  close(): Promise<void>;
}

export interface AISettings {
  /** Provider name, e.g. "deepseek" */
  provider: string;
  /** Base URL of the AI API endpoint */
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Represents an AI-generated suggestion awaiting user confirmation */
export interface AISuggestion {
  /** Human-readable label of the action, e.g. "润色" */
  actionLabel: string;
  /** The AI-generated content to be applied */
  content: string;
  /** Whether to replace the original selection (polish/expand/summarize) or append after it (continue) */
  insertMode: 'replace' | 'append';
  /** Start position of the original selection in the document */
  from: number;
  /** End position of the original selection in the document */
  to: number;
}

export interface LampAIAPI {
  chat(systemPrompt: string, userMessage: string): Promise<string>;
  getSettings(): Promise<AISettings>;
  saveSettings(settings: AISettings): Promise<void>;
  /** Mark an AI operation as started — shows a loading overlay */
  startLoading(actionLabel: string): void;
  /** Mark the current AI operation as finished — hides the loading overlay */
  stopLoading(): void;
  /** Whether an AI operation is currently in progress */
  isLoading(): boolean;
  /** Set an error message — replaces the loading overlay with an error display */
  setError(message: string): void;
  /** Clear any error state (e.g. before starting a new action) */
  clearError(): void;
  /**
   * Show an AI result as a suggestion overlay — the result is NOT applied yet.
   * The editor state (selection, cursor) is preserved until the user accepts or dismisses.
   */
  showSuggestion(suggestion: AISuggestion): void;
  /** Clear any active suggestion */
  clearSuggestion(): void;
  /** Current loading state — reactive, consumed by the UI */
  readonly loadingState: {
    readonly isLoading: boolean;
    readonly actionLabel: string;
    readonly error: string | null;
    readonly suggestion: AISuggestion | null;
  };
}

export interface LampUIAPI {
  dialog(options: {
    title?: string;
    message: string;
    buttons?: Array<{ label: string; value: string }>;
  }): Promise<string | null>;
  notification(options: {
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  }): void;
  showCommandPalette(): void;
}

export interface RegisteredCommand {
  id: string;
  label: string;
  keybinding?: string;
  icon?: string;
}

export interface LampCommandsAPI {
  register(command: {
    id: string;
    label: string;
    keybinding?: string;
    icon?: string;
    handler: () => void | Promise<void>;
  }): () => void; // Returns an unregister function
  execute(commandId: string): Promise<void>;
  getAll(): RegisteredCommand[];
  unregister(commandId: string): void;
}

export interface LampStorageAPI {
  get<T = unknown>(key: string, defaultValue?: T): T;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
  keys(): string[];
  clear(): void;
}

export interface LampShortcutsAPI {
  getAll(): Array<{ id: string; label: string; defaultAccelerator?: string; effectiveAccelerator?: string }>;
  setOverride(commandId: string, accelerator: string | null): void;
  resetToDefault(commandId: string): void;
  checkConflict(accelerator: string, excludeId?: string): string | null;
}

export interface LampEventAPI {
  on<T = unknown>(event: string, handler: (data: T) => void): () => void;
  once<T = unknown>(event: string, handler: (data: T) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  emit<T = unknown>(event: string, data?: T): void;
}

/** Locale messages contributed by a plugin — keyed by locale id, e.g. "zh-CN" or "en-US" */
export interface PluginLocaleMessages {
  [locale: string]: Record<string, unknown>;
}

export interface LampI18nAPI {
  /**
   * Register or merge locale messages for this plugin.
   * The messages are merged under the plugin's namespace: `plugins.<id-with-dashes>.<key>`.
   * Example: calling setLocaleMessages('zh-CN', { polish: '润色' }) for plugin 'lamp.ai-actions'
   * makes it accessible as `t('plugins.lamp-ai-actions.polish')`.
   */
  setLocaleMessages(locale: string, messages: Record<string, unknown>): void;
}

// ─── Standard Host Events ───────────────────────────────────

export type HostEvent =
  | 'lamp.workspace.opened'       // { rootPath: string, name: string }
  | 'lamp.workspace.closed'
  | 'lamp.editor.ready'          // Editor instance is available
  | 'lamp.editor.destroy'
  | 'lamp.editor.selectionChange' // { selectedText: string }
  | 'lamp.file.opened'           // { filePath: string }
  | 'lamp.file.saved'            // { filePath: string }
  | 'lamp.file.changed'          // FileChangeEvent from watcher
  | 'lamp.tab.opened'            // { tabId: string }
  | 'lamp.tab.closed'            // { tabId: string }
  | 'lamp.tab.active'            // { tabId: string }
  | 'lamp.plugins.ready'         // { count: number }
  | 'lamp.plugin.activated'      // { id: string, scope: string }
  | 'lamp.plugin.deactivated'    // { id: string }
  | 'lamp.ui.commandPalette.show'
  | 'lamp.ui.commandPalette.hide';

// ─── Plugin Host ────────────────────────────────────────────

export type PluginScope = 'builtin' | 'workspace' | 'user';

export interface LoadedPlugin {
  manifest: LampPluginManifest;
  scope: PluginScope;
  plugin: LampPlugin;
  ctx: PluginContext;
}

// ─── PluginContext ──────────────────────────────────────────

export class PluginContext {
  readonly id: string;
  readonly version = '1.0.0';

  editor: LampEditorAPI;
  file: LampFileAPI;
  workspace: LampWorkspaceAPI;
  ai: LampAIAPI;
  ui: LampUIAPI;
  commands: LampCommandsAPI;
  storage: LampStorageAPI;
  event: LampEventAPI;
  i18n: LampI18nAPI;
  shortcuts: LampShortcutsAPI;

  constructor(
    manifest: LampPluginManifest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private host: {
      events: any;
      contributions: any;
      editorInstance: Editor | null;
      workspace: { isOpen: boolean; rootPath: string; name: string };
      storageService: unknown;
      commandService: unknown;
      shortcutService: unknown;
      aiState: { isLoading: boolean; actionLabel: string; error: string | null; suggestion: AISuggestion | null };
      i18nService: {
        setLocaleMessages(pluginId: string, locale: string, messages: Record<string, unknown>): void;
      };
    }
  ) {
    this.id = manifest.id;
    this.editor    = this._buildEditorAPI();
    this.file      = this._buildFileAPI();
    this.workspace = this._buildWorkspaceAPI();
    this.ai        = this._buildAIAPI();
    this.ui        = this._buildUIAPI();
    this.commands  = this._buildCommandsAPI();
    this.storage   = this._buildStorageAPI();
    this.event     = this._buildEventAPI();
    this.i18n      = this._buildI18nAPI();
    this.shortcuts = this._buildShortcutsAPI();
  }

  private _buildEditorAPI(): LampEditorAPI {
    const getEditor = () => this.host.editorInstance;
    return {
      getSelection: () => getEditor()?.state.selection.empty ? '' : getEditor()?.state.doc.textBetween(getEditor()!.state.selection.from, getEditor()!.state.selection.to, ' ') ?? '',
      getContent: () => getEditor()?.getHTML() ?? '',
      getText: () => getEditor()?.getText() ?? '',
      insertContent: (html) => getEditor()?.chain().focus().insertContent(html).run(),
      insertContentAtCursor: (html) => getEditor()?.chain().focus().insertContentAt(getEditor()!.state.selection.to, html).run(),
      deleteSelection: () => getEditor()?.chain().focus().deleteSelection().run(),
      applyMark: (mark, attrs) => getEditor()?.chain().focus().setMark(mark, attrs).run(),
      removeMark: (mark) => getEditor()?.chain().focus().unsetMark(mark).run(),
      isActive: (name, attrs) => getEditor()?.isActive(name, attrs) ?? false,
      setTextAlign: (alignment) => getEditor()?.chain().focus().setTextAlign(alignment).run(),
      undo: () => getEditor()?.chain().focus().undo().run(),
      redo: () => getEditor()?.chain().focus().redo().run(),
      registerTipTapExtension: (def) => {
        // This is handled at editor creation time; dynamic registration is a no-op here
        console.warn(`[PluginContext] registerTipTapExtension("${def.name}") called — dynamic registration not yet implemented. Contribute via onLoad + tipTapExtensions.`);
      },
      getRawEditor: () => getEditor() ?? null,
    };
  }

  private _buildFileAPI(): LampFileAPI {
    const api = requireLampAPI('plugin file API build');
    return {
      read: (filePath) => api.readTextFile(filePath),
      write: (filePath, content) => api.saveInfo(filePath, content),
      exists: (filePath) => api.hasFile(filePath),
      delete: (filePath) => api.delFile(filePath),
      getFolderContent: (folderPath) => api.getFolderContent(folderPath),
      watch: (folderPath) => api.startWatching(folderPath),
      unwatch: () => api.stopWatching(),
    };
  }

  private _buildWorkspaceAPI(): LampWorkspaceAPI {
    const host = this.host;
    return {
      get isOpen() { return host.workspace.isOpen; },
      get rootPath() { return host.workspace.rootPath; },
      get name() { return host.workspace.name; },
      open: async () => {
        const api = requireLampAPI('plugin workspace open');
        const result = await api.openWorkspace();
        if (result) {
          host.workspace.isOpen = true;
          host.workspace.rootPath = result.rootPath;
          host.workspace.name = result.name;
          host.events.emit('lamp.workspace.opened', { rootPath: result.rootPath, name: result.name });
        }
      },
      close: () => {
        host.workspace.isOpen = false;
        host.events.emit('lamp.workspace.closed', {});
      },
    };
  }

  private _buildAIAPI(): LampAIAPI {
    const aiState = this.host.aiState;
    return {
      chat: (systemPrompt, userMessage) => requireLampAPI('plugin ai chat').ai(systemPrompt, userMessage),
      getSettings: () => requireLampAPI('plugin ai get settings').getAiSettings(),
      saveSettings: (settings) => requireLampAPI('plugin ai save settings').saveAiSettings(settings),
      startLoading: (actionLabel) => {
        aiState.isLoading = true;
        aiState.actionLabel = actionLabel;
        aiState.error = null;
        aiState.suggestion = null;
      },
      stopLoading: () => {
        aiState.isLoading = false;
        aiState.actionLabel = '';
      },
      isLoading: () => aiState.isLoading,
      setError: (message) => {
        aiState.isLoading = false;
        aiState.actionLabel = '';
        aiState.error = message;
        aiState.suggestion = null;
      },
      clearError: () => {
        aiState.error = null;
      },
      showSuggestion: (suggestion) => {
        aiState.isLoading = false;
        aiState.actionLabel = '';
        aiState.suggestion = suggestion;
      },
      clearSuggestion: () => {
        aiState.suggestion = null;
      },
      loadingState: {
        get isLoading() { return aiState.isLoading; },
        get actionLabel() { return aiState.actionLabel; },
        get error() { return aiState.error; },
        get suggestion() { return aiState.suggestion; },
      },
    };
  }

  private _buildUIAPI(): LampUIAPI {
    return {
      dialog: async (options) => {
        // Simple confirm-based fallback; will be replaced by a proper dialog component
        const confirmed = window.confirm(`${options.title ? options.title + '\n' : ''}${options.message}`);
        return confirmed ? (options.buttons?.[0]?.value ?? 'ok') : null;
      },
      notification: (options) => {
        // Simple console-based fallback; will be replaced by toast component
        console.info(`[LAMP] ${options.type?.toUpperCase() ?? 'INFO'}: ${options.message}`);
      },
      showCommandPalette: () => {
        this.host.events.emit('lamp.ui.commandPalette.show', {});
      },
    };
  }

  private _buildCommandsAPI(): LampCommandsAPI {
    return {
      register: (cmd) => {
        const svc = this.host.commandService as { register: (id: string, cmd: { id: string; label: string; keybinding?: string; icon?: string; handler: () => void }) => () => void };
        return svc.register(this.id, cmd);
      },
      execute: async (commandId) => {
        const svc = this.host.commandService as { execute: (id: string) => Promise<void> };
        return svc.execute(commandId);
      },
      getAll: () => {
        const svc = this.host.commandService as { getAll: () => RegisteredCommand[] };
        return svc.getAll();
      },
      unregister: (commandId) => {
        const svc = this.host.commandService as { unregister: (id: string) => void };
        svc.unregister(commandId);
      },
    };
  }

  private _buildStorageAPI(): LampStorageAPI {
    const svc = this.host.storageService as {
      get: <T>(pluginId: string, key: string, defaultValue?: T) => T;
      set: <T>(pluginId: string, key: string, value: T) => void;
      remove: (pluginId: string, key: string) => void;
      keys: (pluginId: string) => string[];
      clear: (pluginId: string) => void;
    };
    const pid = this.id;
    return {
      get:    <T>(key, defaultValue) => svc.get(pid, key, defaultValue),
      set:    <T>(key, value)        => svc.set(pid, key, value),
      remove: (key)                  => svc.remove(pid, key),
      keys:   ()                      => svc.keys(pid),
      clear:  ()                      => svc.clear(pid),
    };
  }

  private _buildEventAPI(): LampEventAPI {
    const eb = this.host.events as {
      on: <T>(event: string, handler: (data: T) => void) => () => void;
      once: <T>(event: string, handler: (data: T) => void) => void;
      off: (event: string, handler: (data: unknown) => void) => void;
      emit: <T>(event: string, data?: T) => void;
    };
    return {
      on:     <T>(event, handler) => eb.on<T>(event, handler),
      once:   <T>(event, handler) => eb.once<T>(event, handler),
      off:    (event, handler)    => eb.off(event, handler),
      emit:   <T>(event, data)    => eb.emit<T>(event, data),
    };
  }

  private _buildI18nAPI(): LampI18nAPI {
    const pid = this.id;
    return {
      setLocaleMessages: (locale, messages) => {
        this.host.i18nService.setLocaleMessages(pid, locale, messages);
      },
    };
  }

  private _buildShortcutsAPI(): LampShortcutsAPI {
    const ss = this.host.shortcutService as {
      getAll(): Array<{ id: string; label: string; defaultAccelerator?: string; effectiveAccelerator?: string }>;
      setOverride(commandId: string, accelerator: string | null): void;
      resetToDefault(commandId: string): void;
      checkConflict(accelerator: string, excludeId?: string): string | null;
    };
    return {
      getAll: () => ss.getAll(),
      setOverride: (commandId, accelerator) => ss.setOverride(commandId, accelerator),
      resetToDefault: (commandId) => ss.resetToDefault(commandId),
      checkConflict: (accelerator, excludeId) => ss.checkConflict(accelerator, excludeId),
    };
  }
}
