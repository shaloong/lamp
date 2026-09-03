import type { Editor } from '@tiptap/core';
import { requireLampAPI } from '../lib/lampApi';
import type {
  AISettings,
  AISuggestion,
  LampAIAPI,
  LampCommandsAPI,
  LampEditorAPI,
  LampEventAPI,
  LampFileAPI,
  LampHostAPI,
  LampI18nAPI,
  LampPluginManifest,
  LampShortcutsAPI,
  LampStorageAPI,
  LampUIAPI,
  LampWorkspaceAPI,
  RegisteredCommand,
} from './types';

interface PluginContextHost {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contributions: any;
  editorInstance: Editor | null;
  workspace: { isOpen: boolean; rootPath: string; name: string };
  storageService: unknown;
  commandService: unknown;
  shortcutService: unknown;
  aiState: { isLoading: boolean; actionLabel: string; error: string | null; suggestion: AISuggestion | null };
  i18nService: {
    key(pluginId: string, localKey: string): string;
    t(pluginId: string, localKey: string, params?: Record<string, unknown>): string;
    getLocale(): string;
    getFallbackLocale(): string;
    setLocaleMessages(pluginId: string, locale: string, messages: Record<string, unknown>): void;
    setAllLocaleMessages(pluginId: string, messagesByLocale: Record<string, Record<string, unknown>>): void;
  };
}

export class PluginContext implements LampHostAPI {
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
    private host: PluginContextHost,
  ) {
    this.id = manifest.id;
    this.editor = this.buildEditorAPI();
    this.file = this.buildFileAPI();
    this.workspace = this.buildWorkspaceAPI();
    this.ai = this.buildAIAPI();
    this.ui = this.buildUIAPI();
    this.commands = this.buildCommandsAPI();
    this.storage = this.buildStorageAPI();
    this.event = this.buildEventAPI();
    this.i18n = this.buildI18nAPI();
    this.shortcuts = this.buildShortcutsAPI();
  }

  private buildEditorAPI(): LampEditorAPI {
    const getEditor = () => this.host.editorInstance;
    return {
      getSelection: () => getEditor()?.state.selection.empty ? '' : getEditor()?.state.doc.textBetween(getEditor()!.state.selection.from, getEditor()!.state.selection.to, ' ') ?? '',
      getSelectionRange: () => {
        const editor = getEditor();
        if (!editor) return { from: 0, to: 0, empty: true };
        return {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
          empty: editor.state.selection.empty,
        };
      },
      getContent: () => getEditor()?.getHTML() ?? '',
      getText: () => getEditor()?.getText() ?? '',
      setContent: (html) => getEditor()?.commands.setContent(html, false),
      focus: () => getEditor()?.chain().focus().run(),
      insertContent: (html) => getEditor()?.chain().focus().insertContent(html).run(),
      insertContentAtCursor: (html) => getEditor()?.chain().focus().insertContentAt(getEditor()!.state.selection.to, html).run(),
      replaceSelection: (html) => getEditor()?.chain().focus().insertContent(html).run(),
      deleteSelection: () => getEditor()?.chain().focus().deleteSelection().run(),
      applyMark: (mark, attrs) => getEditor()?.chain().focus().setMark(mark, attrs).run(),
      removeMark: (mark) => getEditor()?.chain().focus().unsetMark(mark).run(),
      isActive: (name, attrs) => getEditor()?.isActive(name, attrs) ?? false,
      setTextAlign: (alignment) => getEditor()?.chain().focus().setTextAlign(alignment).run(),
      undo: () => getEditor()?.chain().focus().undo().run(),
      redo: () => getEditor()?.chain().focus().redo().run(),
      registerTipTapExtension: (def) => {
        console.warn(`[PluginContext] registerTipTapExtension("${def.name}") called after editor creation. Prefer contributing tipTapExtensions during onLoad.`);
      },
      getRawEditor: () => getEditor() ?? null,
    };
  }

  private buildFileAPI(): LampFileAPI {
    const api = requireLampAPI('plugin file API build');
    return {
      read: (filePath) => api.readTextFile(filePath),
      write: (filePath, content) => api.saveInfo(filePath, content),
      exists: (filePath) => api.hasFile(filePath),
      delete: (filePath) => api.delFile(filePath).then(() => undefined),
      openDialog: () => api.menuFileOpen(),
      saveAs: async (defaultName, content) => {
        const path = await api.saveFileAs(defaultName);
        if (path && content !== undefined) {
          await api.saveInfo(path, content);
        }
        return path || null;
      },
      searchWorkspace: (workspacePath, query, options) => api.searchWorkspace(workspacePath, query, options),
      getFolderContent: (folderPath) => api.getFolderContent(folderPath),
      watch: (folderPath) => api.startWatching(folderPath),
      unwatch: () => api.stopWatching(),
      getAppDataDir: () => api.getAppDataDir(),
      getUserPluginsDir: () => api.getUserPluginsDir(),
    };
  }

  private buildWorkspaceAPI(): LampWorkspaceAPI {
    const host = this.host;
    return {
      get isOpen() { return host.workspace.isOpen; },
      get rootPath() { return host.workspace.rootPath; },
      get name() { return host.workspace.name; },
      open: async () => {
        const commands = this.host.commandService as { execute: (id: string) => Promise<void> };
        await commands.execute('app.openWorkspace');
      },
      close: async () => {
        const commands = this.host.commandService as { execute: (id: string) => Promise<void> };
        await commands.execute('app.closeWorkspace');
      },
      contains: (filePath) => requireLampAPI('plugin workspace contains').isFileInDirectory(filePath, host.workspace.rootPath),
    };
  }

  private buildAIAPI(): LampAIAPI {
    const aiState = this.host.aiState;
    return {
      chat: (systemPrompt, userMessage) => requireLampAPI('plugin ai chat').ai(systemPrompt, userMessage),
      getSettings: () => requireLampAPI('plugin ai get settings').getAiSettings() as Promise<AISettings>,
      saveSettings: (settings) => requireLampAPI('plugin ai save settings').saveAiSettings(settings).then(() => undefined),
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

  private buildUIAPI(): LampUIAPI {
    return {
      dialog: async (options) => {
        const confirmed = window.confirm(`${options.title ? options.title + '\n' : ''}${options.message}`);
        return confirmed ? (options.buttons?.[0]?.value ?? 'ok') : null;
      },
      notification: (options) => {
        console.info(`[LAMP] ${options.type?.toUpperCase() ?? 'INFO'}: ${options.message}`);
      },
      showCommandPalette: () => {
        this.host.events.emit('lamp.ui.commandPalette.show', {});
      },
      hideCommandPalette: () => {
        this.host.events.emit('lamp.ui.commandPalette.hide', {});
      },
    };
  }

  private buildCommandsAPI(): LampCommandsAPI {
    return {
      register: (cmd) => {
        const svc = this.host.commandService as { register: (id: string, cmd: { id: string; label: string; keybinding?: string; icon?: string; handler: () => void | Promise<void> }) => () => void };
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

  private buildStorageAPI(): LampStorageAPI {
    const svc = this.host.storageService as {
      get: <T>(pluginId: string, key: string, defaultValue?: T) => T;
      set: <T>(pluginId: string, key: string, value: T) => void;
      remove: (pluginId: string, key: string) => void;
      keys: (pluginId: string) => string[];
      clear: (pluginId: string) => void;
    };
    const pid = this.id;
    return {
      get: (key, defaultValue) => svc.get(pid, key, defaultValue),
      set: (key, value) => svc.set(pid, key, value),
      remove: (key) => svc.remove(pid, key),
      keys: () => svc.keys(pid),
      clear: () => svc.clear(pid),
    };
  }

  private buildEventAPI(): LampEventAPI {
    const eb = this.host.events as {
      on: <T>(event: string, handler: (data: T) => void) => () => void;
      once: <T>(event: string, handler: (data: T) => void) => void;
      off: (event: string, handler: (data: unknown) => void) => void;
      emit: <T>(event: string, data?: T) => void;
    };
    return {
      on: <T>(event, handler) => eb.on<T>(event, handler),
      once: <T>(event, handler) => eb.once<T>(event, handler),
      off: (event, handler) => eb.off(event, handler),
      emit: <T>(event, data) => eb.emit<T>(event, data),
    };
  }

  private buildI18nAPI(): LampI18nAPI {
    const pid = this.id;
    return {
      key: (localKey) => this.host.i18nService.key(pid, localKey),
      t: (localKey, params) => this.host.i18nService.t(pid, localKey, params),
      getLocale: () => this.host.i18nService.getLocale(),
      getFallbackLocale: () => this.host.i18nService.getFallbackLocale(),
      setLocaleMessages: (locale, messages) => {
        this.host.i18nService.setLocaleMessages(pid, locale, messages);
      },
      setMessages: (messagesByLocale) => {
        this.host.i18nService.setAllLocaleMessages(pid, messagesByLocale);
      },
    };
  }

  private buildShortcutsAPI(): LampShortcutsAPI {
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
