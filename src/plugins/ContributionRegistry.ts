// ============================================================
// LAMP Plugin System — Contribution Registry
// Central aggregator for all plugin contribution points.
// Components (Editor, MainMenu, StatusBar, etc.) consume
// sorted arrays from this registry and never call plugins directly.
// ============================================================

import { reactive, computed } from 'vue';
import type {
  PluginContributions,
  EditorToolbarItem,
  BubbleMenuItem,
  MenuItem,
  SidebarPanelContribution,
  StatusBarItem,
  AIActionContribution,
  FileHandlerContribution,
  ThemeContribution,
  TipTapExtensionDefinition,
} from './types';

// Registry maps: contribution id (with plugin namespace) → item
type ReactiveContributionMap<T> = Map<string, T>;

export class ContributionRegistry {
  private _editorToolbar   = reactive(new Map<string, EditorToolbarItem>()) as ReactiveContributionMap<EditorToolbarItem>;
  private _bubbleMenu      = reactive(new Map<string, BubbleMenuItem>()) as ReactiveContributionMap<BubbleMenuItem>;
  private _menuItems       = reactive(new Map<string, MenuItem>()) as ReactiveContributionMap<MenuItem>;
  private _sidebarPanels   = reactive(new Map<string, SidebarPanelContribution>()) as ReactiveContributionMap<SidebarPanelContribution>;
  private _statusBarItems  = reactive(new Map<string, StatusBarItem>()) as ReactiveContributionMap<StatusBarItem>;
  private _aiActions       = reactive(new Map<string, AIActionContribution>()) as ReactiveContributionMap<AIActionContribution>;
  private _fileHandlers    = reactive(new Map<string, FileHandlerContribution>()) as ReactiveContributionMap<FileHandlerContribution>;
  private _themes         = reactive(new Map<string, ThemeContribution>()) as ReactiveContributionMap<ThemeContribution>;
  private _tipTapExtensions = reactive(new Map<string, TipTapExtensionDefinition>()) as ReactiveContributionMap<TipTapExtensionDefinition>;

  /**
   * Register a plugin's contributions. Later registrations with the same
   * contribution id (namespaced) will overwrite earlier ones.
   */
  register(pluginId: string, contribs: PluginContributions): void {
    this._mergeMap(this._editorToolbar,    pluginId, contribs.editorToolbar);
    this._mergeMap(this._bubbleMenu,       pluginId, contribs.bubbleMenu);
    this._mergeMap(this._menuItems,        pluginId, contribs.menuItems);
    this._mergeMap(this._sidebarPanels,    pluginId, contribs.sidebarPanels);
    this._mergeMap(this._statusBarItems,  pluginId, contribs.statusBarItems);
    this._mergeMap(this._aiActions,       pluginId, contribs.aiActions);
    this._mergeMap(this._fileHandlers,    pluginId, contribs.fileHandlers);
    this._mergeMap(this._themes,           pluginId, contribs.themes);

    if (contribs.tipTapExtensions) {
      for (const ext of contribs.tipTapExtensions) {
        this._tipTapExtensions.set(`${pluginId}:${ext.name}`, ext);
      }
    }
  }

  /**
   * Unregister all contributions from a plugin.
   */
  unregister(pluginId: string): void {
    const allMaps = [
      this._editorToolbar, this._bubbleMenu, this._menuItems,
      this._sidebarPanels, this._statusBarItems, this._aiActions,
      this._fileHandlers, this._themes, this._tipTapExtensions,
    ];
    for (const map of allMaps) {
      for (const key of [...map.keys()]) {
        if (key.startsWith(pluginId + ':')) {
          map.delete(key);
        }
      }
    }
  }

  // ─── Sorted computed arrays for Vue consumption ──────────

  get sortedEditorToolbar(): EditorToolbarItem[] {
    return this._sort(this._editorToolbar, 'priority');
  }

  get sortedBubbleMenu(): BubbleMenuItem[] {
    return this._sort(this._bubbleMenu, 'priority');
  }

  get sortedMenuItems(): MenuItem[] {
    return this._sort(this._menuItems, 'priority');
  }

  get sortedSidebarPanels(): SidebarPanelContribution[] {
    return this._sort(this._sidebarPanels, 'priority');
  }

  get sortedStatusBarItems(): StatusBarItem[] {
    return this._sort(this._statusBarItems, 'priority');
  }

  get sortedAIActions(): AIActionContribution[] {
    return this._sort(this._aiActions, 'priority');
  }

  get sortedFileHandlers(): FileHandlerContribution[] {
    return Array.from(this._fileHandlers.values());
  }

  get sortedThemes(): ThemeContribution[] {
    return Array.from(this._themes.values());
  }

  get sortedTipTapExtensions(): TipTapExtensionDefinition[] {
    return Array.from(this._tipTapExtensions.values());
  }

  // ─── Menu items by 'where' group ──────────────────────────

  getMenuItemsBy(where: string): MenuItem[] {
    return this.sortedMenuItems.filter(item => item.where === where);
  }

  // ─── Raw maps for programmatic access ────────────────────

  get editorToolbarMap() { return this._editorToolbar; }
  get bubbleMenuMap()    { return this._bubbleMenu; }
  get menuItemsMap()     { return this._menuItems; }
  get sidebarPanelsMap() { return this._sidebarPanels; }
  get statusBarItemsMap(){ return this._statusBarItems; }
  get aiActionsMap()     { return this._aiActions; }
  get fileHandlersMap()  { return this._fileHandlers; }
  get themesMap()        { return this._themes; }
  get tipTapExtensionsMap(){ return this._tipTapExtensions; }

  // ─── Helpers ─────────────────────────────────────────────

  private _mergeMap<T extends { id: string }>(
    map: ReactiveContributionMap<T>,
    pluginId: string,
    items?: T[]
  ): void {
    if (!items) return;
    for (const item of items) {
      // Key is namespaced to prevent collisions
      // Also attach pluginId on the item so consumers don't need to parse it
      map.set(`${pluginId}:${item.id}`, { ...item, pluginId } as unknown as T);
    }
  }

  private _sort<T extends { priority?: number }>(
    map: ReactiveContributionMap<T>,
    priorityKey: 'priority'
  ): T[] {
    return Array.from(map.values())
      .sort((a, b) => (b[priorityKey] ?? 50) - (a[priorityKey] ?? 50));
  }
}
