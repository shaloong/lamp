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

// ─── Global window extension ────────────────────────────────

declare global {
  interface Window {
    /** The LAMP Host API exposed to plugins */
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
