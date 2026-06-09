// ============================================================
// LAMP Plugin System — Type Declarations
// Reference this from plugin entry points (*.ts files inside plugins)
// for full IDE autocomplete of the `lamp.*` host API.
// ============================================================

import type { Editor } from '@tiptap/core';
import type {
  LampHostAPI,
  LampPluginManifest,
  LampPlugin,
  PluginContributions,
  EditorToolbarItem,
  BubbleMenuItem,
  MenuItem,
  SidebarPanelContribution,
  StatusBarItem,
  AIActionContribution,
  TipTapExtensionDefinition,
  PluginCapability,
  RegisteredCommand,
  AISettings,
  LampEditorAPI,
  LampFileAPI,
  LampWorkspaceAPI,
  LampAIAPI,
  LampUIAPI,
  LampCommandsAPI,
  LampStorageAPI,
  LampEventAPI,
} from './types';

// ─── Raw Tauri IPC Bridge (preload.js) ───────────────────────

/** The raw Tauri IPC bridge exposed by preload.js */
interface LampAPI {
  // Window
  minWindow(): Promise<void>;
  maxWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  menuViewFullScreen(): Promise<void>;
  isMaximized(): Promise<boolean>;
  // File
  menuFileOpen(): Promise<[number, string, string] | [-1]>;
  saveInfo(filePath: string, content: string): Promise<void>;
  saveFileAs(fileName: string, data: string): Promise<string>;
  getFolderContent(folderPath: string): Promise<import('./types').FileInfo[]>;
  openSpecificFile(filePath: string): Promise<import('@tauri-apps/api/core').JsonValue[]>;
  hasFile(filePath: string): Promise<boolean>;
  delFile(filePath: string): Promise<boolean>;
  // Edit (DOM fallback)
  menuEditUndo(): void;
  menuEditRedo(): void;
  menuEditCut(): void;
  menuEditCopy(): void;
  menuEditPaste(): void;
  menuEditDelete(): void;
  menuEditSelectAll(): void;
  // AI
  ai(prompt: string, message: string): Promise<string>;
  getAiSettings(): Promise<import('./types').AISettings>;
  saveAiSettings(settings: import('./types').AISettings): Promise<boolean>;
  // Settings
  getGeneralSettings(): Promise<unknown>;
  saveGeneralSettings(settings: unknown): Promise<boolean>;
  // Events
  openFile(callback: (status: number, path: string, data: string) => void): void;
  saveFile(callback: () => void): void;
  newFile(callback: (path: string) => void): void;
  onFileChange(callback: (event: unknown) => void): void;
  // Workspace
  openWorkspace(): Promise<{ name: string; rootPath: string } | null>;
  isFileInDirectory(filePath: string, dirPath: string): Promise<boolean>;
  // File watching
  startWatching(folderPath: string): Promise<void>;
  stopWatching(): Promise<void>;
  // Plugins
  readTextFile(filePath: string): Promise<string>;
  getAppDataDir(): Promise<string>;
  getUserPluginsDir(): Promise<string>;
}

// ─── Global window extension ────────────────────────────────

declare global {
  interface Window {
    /** Raw Tauri IPC bridge exposed by preload.js */
    lampAPI: LampAPI;
    /** High-level plugin host API */
    lamp: LampHostAPI;
  }
}

// ─── Plugin Entry Point Shape ────────────────────────────────

/**
 * A plugin's main module must export a default object conforming to this shape.
 * Example:
 * ```js
 * export default {
 *   onLoad(ctx) { return { editorToolbar: [...] }; },
 *   onActivate(ctx) { /* async init *\/ },
 *   onDeactivate() { /* cleanup *\/ },
 * };
 * ```
 */
export interface PluginMainModule {
  /** Plugin manifest (auto-attached by the build system) */
  manifest?: LampPluginManifest;
  default?: LampPlugin;
}

// ─── Re-export key types for convenience ─────────────────────

export {
  LampHostAPI,
  LampPluginManifest,
  LampPlugin,
  PluginContributions,
  EditorToolbarItem,
  BubbleMenuItem,
  MenuItem,
  SidebarPanelContribution,
  StatusBarItem,
  AIActionContribution,
  TipTapExtensionDefinition,
  PluginCapability,
  RegisteredCommand,
  AISettings,
  LampEditorAPI,
  LampFileAPI,
  LampWorkspaceAPI,
  LampAIAPI,
  LampUIAPI,
  LampCommandsAPI,
  LampStorageAPI,
  LampEventAPI,
  Editor,
};

export {};
