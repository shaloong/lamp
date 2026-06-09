<template>
  <div class="app">
    <div class="app-menu">
      <AppMenu @minWindow="minWindow" @maxWindow="maxWindow" @closeWindow="closeWindow" :can-save="canSave" />
    </div>
    <div class="app-content">
      <Sidebar :explorerPanelActive="explorerPanelActive" :workspaceStore="workspaceStore"
        :folderContent="folderContent" :toolViewHeight="toolViewHeight" :tempFiles="tempFiles"
        :expandedKeys="expandedKeys" :showExplorerButton="sidebarButtonVisibility.explorer"
        v-model:tempSectionExpanded="tempSectionExpanded" @toggle-explorer-panel="toggleExplorerPanel"
        @open-settings="openSettingsDialog" @open-workspace="openWorkspace" @open-temp-file="openTempFile"
        @node-click="handleNodeClick" @toggle-expand="handleToggleExpand" @contextmenu="onSidebarContextMenu" />
      <div class="editor flex flex-col h-full">
        <!-- 编辑器选项卡组 -->
        <div v-if="tabs.length > 0" class="editor-tabs" @contextmenu="onTabBarContextMenu">
          <!-- 编辑器选项卡 -->
          <div class="editor-tab h-5.5 pt-2 pr-2.5 pb-1 pl-3.5 box-content" v-for="(tab, index) in tabs" :key="index"
            @click="switchTab(index)" @contextmenu.stop.prevent="onTabContextMenu(index, $event)"
            :class="{ activeTab: activeTab === index }">
            <File :size="12" style="margin-right: 4px; flex-shrink: 0;" />
            {{ tab.title }}
            <button class="close-button" @click.stop="toggleCloseTab(index)">
              <X :size="12" />
            </button>
            <span class="active-indicator" v-show="activeTab === index"></span>
          </div>
        </div>
        <!-- 编辑器内容 -->
        <Editor
          v-for="(item, index) in tabs"
          :key="item.id"
          :ref="(el) => setEditorRef(item.id, el)"
          v-show="activeTab === index"
          @update:modelValue="autoSave"
          v-model="item.content"
        />
        <!-- 启动页面 -->
        <StartPage v-if="tabs.length === 0" class="flex-1" :recentFiles="recentFiles" @new-file="newFile"
          @open-file="openFileDialog" @open-workspace="openWorkspace" @open-recent="openSpecificFile" />
      </div>
    </div>
    <div class="mask">
      <Dialog v-model:open="dialogConfirmCloseTab" @update:open="(val) => { if (!val) indexCloseTab = -1; }">
        <DialogContent style="max-width: 500px;">
          <DialogHeader>
            <DialogTitle>{{ $t('app.unsavedTitle') }}</DialogTitle>
          </DialogHeader>
          <p style="padding: 8px 0;">{{ $t('app.unsavedMessage') }}</p>
          <DialogFooter>
            <Button variant="destructive" @click="handleNotSave">
              {{ $t('app.dontSaveAndClose') }}
            </Button>
            <Button @click="handleSave">
              {{ $t('app.saveAndClose') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="dialogRecovery" @update:open="(val) => { if (!val) { dialogRecovery = false; recoveryFiles = []; } }">
        <DialogContent style="max-width: 500px;">
          <DialogHeader>
            <DialogTitle>恢复未保存的文档</DialogTitle>
          </DialogHeader>
          <p style="padding: 8px 0; color: var(--muted-foreground);">
            检测到以下自动保存的文档。上次退出时可能未正常保存。
          </p>
          <div class="recovery-list" style="max-height: 300px; overflow-y: auto; padding: 8px 0;">
            <div v-for="file in recoveryFiles" :key="file.temp_path"
              style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border);">
              <div>
                <div style="font-weight: 500;">{{ file.title.replace(/\.autosave$/, '') || 'untitled' }}</div>
                <div style="font-size: 12px; color: var(--muted-foreground);">
                  {{ new Date(file.saved_at).toLocaleString() }}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <Button variant="outline" size="sm" @click="ignoreRecoveryFiles">
                  忽略
                </Button>
                <Button size="sm" @click="recoverFile(file)">
                  恢复
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" @click="ignoreRecoveryFiles">
              不恢复，关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <CommandPalette v-if="dialogCommandPalette" v-model="dialogCommandPalette" />
    <SettingsDialog v-if="dialogSettings" v-model="dialogSettings" />
    <SearchDialog
      v-if="dialogSearch"
      @navigate="handleSearchNavigate"
      @replace="handleSearchReplace"
    />

    <div v-if="contextMenu.visible" class="ui-context-menu" :style="contextMenuStyle" @click.stop>
      <button v-for="item in contextMenu.items" :key="item.id" class="ui-context-item"
        :class="{ checked: item.checked }" :disabled="item.disabled" @click="onContextMenuItemClick(item)">
        <span>{{ item.label }}</span>
        <span class="check">
          <Check :size="14" class="check-icon" :class="item.checked ? 'opacity-100' : 'opacity-0'" />
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import Editor from './components/Editor.vue'
import StartPage from './components/StartPage.vue'
import { marked } from "marked";
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileStore } from '@/stores/files'
import { useSettingsStore } from '@/stores/settings'
import { useSearchStore } from '@/stores/search'
import { pluginHost } from '@/plugins/index'
import { useShortcutCenter } from '@/composables/useShortcutCenter'
import { setupPluginThemes } from '@/composables/usePluginThemes'
import { useTheme } from '@/composables/useTheme'
import { workspaceExplorerMethods } from '@/composables/workspaceExplorerMethods'
import { getLampAPI } from '@/lib/lampApi'
const CommandPalette = defineAsyncComponent(() => import('./components/CommandPalette.vue'))
const SettingsDialog = defineAsyncComponent(() => import('./components/SettingsDialog.vue'))
const SearchDialog = defineAsyncComponent(() => import('./components/SearchDialog.vue'))
import AppMenu from './components/AppMenu.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'
import DialogClose from '@/components/ui/dialog/DialogClose.vue'
import { Check, File, X } from 'lucide-vue-next'
import { i18n } from './i18n.js'

export default {
  components: {
    Editor,
    StartPage,
    CommandPalette,
    SettingsDialog,
    SearchDialog,
    AppMenu,
    Sidebar,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    Check,
    File,
    X,
  },
  data() {
    return {
      explorerPanelActive: false,
      tabs: [],
      activeTab: -1, // -1 表示没有活跃的标签页
      folderContent: "",
      toolViewHeight: 400,
      dialogConfirmCloseTab: false,
      indexCloseTab: -1, // 删除的索引号，-1表示没有传递
      dialogSettings: false,
      dialogCommandPalette: false,
      dialogSearch: false,
      dialogRecovery: false,
      recoveryFiles: [],
      pluginHost,
      // 工作区相关
      tempFiles: [],
      recentFiles: [],
      tempSectionExpanded: true,
      expandedKeys: [],
      isDevMode: import.meta.env.DEV,
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        items: [],
      },
      sidebarButtonVisibility: {
        explorer: true,
      },
      hiddenSidebarPluginPanels: [],
      editorRefs: {},
      documentSearchState: {
        query: '',
        caseSensitive: false,
        wholeWord: false,
        currentIndex: -1,
      },
    };
  },

  setup() {
    const workspaceStore = useWorkspaceStore()
    const fileStore = useFileStore()
    const settingsStore = useSettingsStore()
    const searchStore = useSearchStore()
    return {
      workspaceStore,
      fileStore,
      settingsStore,
      searchStore,
    }
  },

  methods: {
    ...workspaceExplorerMethods,

    /**
     * Resolve a plugin manifest name that may be either a plain string or an i18n key.
     */
    resolvePluginName(name) {
      return name && name.includes('.') ? i18n.global.t(name) : name;
    },

    getLampAPI() {
      return getLampAPI();
    },

    openFile(status, path, data) {
      // Main process opens file dialog and sends back the result via IPC
      if (status === 1 && path) {
        const normalizedPath = path.replace(/\\/g, '/');
        const title = normalizedPath.split('/').pop();
        const [fp, fileContent] = this.format2html(normalizedPath, data);
        // 如果文件已经在标签页中，则切换到该标签页
        const existingIndex = this.tabs.findIndex(tab => tab.filePath === normalizedPath);
        if (existingIndex >= 0) {
          this.activeTab = existingIndex;
        } else {
          this.tabs.push({ title, filePath: normalizedPath, content: fileContent, id: uuidv4() });
          this.activeTab = this.tabs.length - 1;
        }
      }
    },

    async openFileDialog() {
      const api = this.getLampAPI();
      if (!api || typeof api.menuFileOpen !== 'function') {
        console.warn('lampAPI.menuFileOpen is unavailable');
        return;
      }

      try {
        const result = await api.menuFileOpen();
        // menuFileOpen returns [0, path, content] on success
        if (Array.isArray(result) && result[0] === 0 && result[1]) {
          const normalizedPath = result[1].replace(/\\/g, '/');
          this.openFile(1, normalizedPath, result[2] || '');
          return;
        }

        // Compatibility: some environments may return [1, path, content]
        if (Array.isArray(result) && result[0] === 1 && result[1]) {
          const normalizedPath = result[1].replace(/\\/g, '/');
          this.openFile(1, normalizedPath, result[2] || '');
        }
      } catch (error) {
        console.error('Failed to open file dialog', error);
      }
    },

    fileSave(index) {
      // 如果 index 是事件对象或无效值，使用 this.activeTab
      const tabIndex = (typeof index === 'number') ? index : this.activeTab;

      // 使用可选链确保安全访问
      const tab = this.tabs?.[tabIndex];
      if (!tab) {
        console.warn('No tab available to save');
        return;
      }

      if (this.activeTab !== null && tab.filePath) {
        // 如果 filePath 不为空，则执行保存操作
        const api = this.getLampAPI();
        if (!api) return;
        const contentToSave = this.getContentForSave(tab.filePath, tab.content);
        api.saveInfo(tab.filePath, contentToSave);
      } else {
        // 否则执行另存为操作
        this.saveFileAs(tabIndex)
      }
    },
    menuEditUndo() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditUndo();
    },
    menuEditRedo() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditRedo();
    },
    menuEditCut() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditCut();
    },
    menuEditCopy() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditCopy();
    },
    menuEditPaste() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditPaste();
    },
    menuEditSelectAll() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditSelectAll();
    },
    menuEditDelete() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuEditDelete();
    },
    viewFullScreen() {
      const api = this.getLampAPI();
      if (!api) return;
      api.menuViewFullScreen();
    },
    minWindow() {
      const api = this.getLampAPI();
      if (!api) return;
      api.minWindow();
    },
    maxWindow() {
      const api = this.getLampAPI();
      if (!api) return;
      api.maxWindow();
    },
    closeWindow() {
      const api = this.getLampAPI();
      if (!api) return;
      api.closeWindow();
    },

    openSettingsDialog() {
      this.dialogSettings = true;
    },

    // 检查并显示恢复对话框
    async checkRecoveryFiles() {
      if (!this.settingsStore.restoreOnStart) return;

      const api = this.getLampAPI();
      if (!api) return;

      try {
        const files = await api.listAutoSaveFiles();
        if (files && files.length > 0) {
          this.recoveryFiles = files;
          this.dialogRecovery = true;
        }
      } catch (e) {
        console.warn('Failed to check recovery files:', e);
      }
    },

    // 从自动保存恢复文件
    async recoverFile(autoSaveFile) {
      const api = this.getLampAPI();
      if (!api) return;

      try {
        const tabId = uuidv4();
        this.tabs.push({
          title: autoSaveFile.title.replace(/\.autosave$/, '') || 'untitled',
          filePath: '',
          content: autoSaveFile.content,
          id: tabId,
          _autoSavePath: autoSaveFile.temp_path,
        });
        this.activeTab = this.tabs.length - 1;
        this.dialogRecovery = false;
      } catch (e) {
        console.error('Failed to recover file:', e);
      }
    },

    // 忽略恢复文件
    async ignoreRecoveryFiles() {
      this.dialogRecovery = false;
      this.recoveryFiles = [];
    },

    openSearchDialog(mode = 'document') {
      this.searchStore.open({ mode });
      this.dialogSearch = true;
      this.$nextTick(() => {
        if (mode === 'document') {
          this.updateDocumentMatchState(this.searchStore.query)
        }
      })
    },

    openReplaceDialog(mode = 'document') {
      this.searchStore.open({ mode, forceShowReplace: true });
      this.dialogSearch = true;
    },

    setEditorRef(tabId, el) {
      if (!tabId) return;
      if (el) {
        this.editorRefs[tabId] = el;
      } else {
        delete this.editorRefs[tabId];
      }
    },

    getActiveEditorInstance() {
      const activeTab = this.tabs[this.activeTab];
      if (!activeTab) return null;
      const editorComponent = this.editorRefs[activeTab.id];
      return editorComponent || null;
    },

    getDocumentMatches(query) {
      const editor = this.getActiveEditorInstance();
      if (!editor || !query) return [];
      return editor.getDocumentSearchMatches(query, this.searchStore.options);
    },

    updateDocumentMatchState(query) {
      if (!query) {
        this.searchStore.documentTotalMatches = 0
        this.searchStore.documentCurrentMatch = 0
        return []
      }
      const matches = this.getDocumentMatches(query)
      const current = this.documentSearchState.currentIndex >= 0
        ? this.documentSearchState.currentIndex + 1
        : (matches.length > 0 ? 1 : 0)
      this.searchStore.documentTotalMatches = matches.length
      this.searchStore.documentCurrentMatch = current
      return matches
    },

    moveDocumentSelection(query, direction = 'next') {
      const matches = this.getDocumentMatches(query);
      if (matches.length === 0) {
        this.documentSearchState.currentIndex = -1;
        this.searchStore.documentTotalMatches = 0
        this.searchStore.documentCurrentMatch = 0
        return;
      }

      const caseSensitive = !!this.searchStore.options.caseSensitive;
      const wholeWord = !!this.searchStore.options.wholeWord;
      const sameSearch = this.documentSearchState.query === query
        && this.documentSearchState.caseSensitive === caseSensitive
        && this.documentSearchState.wholeWord === wholeWord;

      if (!sameSearch) {
        this.documentSearchState.currentIndex = -1;
      }

      const delta = direction === 'prev' ? -1 : 1;
      const current = this.documentSearchState.currentIndex;
      const nextIndex = current < 0
        ? (delta > 0 ? 0 : matches.length - 1)
        : (current + delta + matches.length) % matches.length;

      this.documentSearchState = {
        query,
        caseSensitive,
        wholeWord,
        currentIndex: nextIndex,
      };
      this.searchStore.documentTotalMatches = matches.length
      this.searchStore.documentCurrentMatch = nextIndex + 1

      const editor = this.getActiveEditorInstance();
      if (editor) {
        editor.setDocumentSearchSelection(matches[nextIndex]);
      }
    },

    handleSearchNavigate({ type, filePath, lineNumber, query, direction = 'next' }) {
      if (type === 'workspace') {
        // Open the file and jump to line
        this.openSpecificFile(filePath).then(() => {
          this.$nextTick(() => {
            this.scrollEditorToLine(lineNumber, query)
          })
        })
      } else {
        if (query) {
          if (direction === 'current') {
            this.updateDocumentMatchState(query)
          } else {
            this.moveDocumentSelection(query, direction)
          }
        } else {
          this.searchStore.documentTotalMatches = 0
          this.searchStore.documentCurrentMatch = 0
        }
      }
    },

    handleSearchReplace({ type, filePath, oldText, newText, all }) {
      if (type === 'workspace') {
        this.replaceInFile(filePath, oldText, newText, all)
      } else {
        if (!oldText || !newText) return
        const editor = this.getActiveEditorInstance()
        if (!editor) return
        const matches = this.getDocumentMatches(oldText)
        if (matches.length === 0) return

        if (all) {
          for (let i = matches.length - 1; i >= 0; i -= 1) {
            editor.replaceDocumentSearchMatch(matches[i], newText)
          }
          this.documentSearchState.currentIndex = -1
          this.updateDocumentMatchState(oldText)
        } else {
          const { currentIndex } = this.documentSearchState
          const targetIndex = currentIndex >= 0 && currentIndex < matches.length ? currentIndex : 0
          editor.replaceDocumentSearchMatch(matches[targetIndex], newText)
          this.documentSearchState.currentIndex = -1
          this.moveDocumentSelection(oldText, 'next')
        }
      }
    },

    async replaceInFile(filePath, oldText, newText, all) {
      const api = this.getLampAPI()
      if (!api) return
      try {
        const data = await api.openSpecificFile(filePath)
        if (!data || data[0] !== 1) return
        let content = data[1]
        if (all) {
          const caseFlag = this.searchStore.options.caseSensitive ? 'g' : 'gi'
          const regex = new RegExp(this.escapeRegex(oldText), caseFlag)
          content = content.replace(regex, newText)
        } else {
          const idx = content.toLowerCase().indexOf(oldText.toLowerCase())
          if (idx !== -1) {
            content = content.slice(0, idx) + newText + content.slice(idx + oldText.length)
          }
        }
        await api.saveInfo(filePath, content)
        // Refresh tab if open
        const tab = this.tabs.find(t => t.filePath === filePath)
        if (tab) {
          tab.content = this.format2html(filePath, content)[1]
        }
        this.searchStore.requestRefresh()
      } catch (err) {
        console.error('Replace failed:', err)
      }
    },

    scrollEditorToLine(lineNumber, query) {
      if (!query) return
      this.moveDocumentSelection(query, 'next')
    },

    escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    },

    newFile() {
      // 新建一个空标签页
      this.tabs.push({ title: i18n.global.t('app.newLampText'), filePath: '', content: '', id: uuidv4() });
      this.activeTab = this.tabs.length - 1;
    },

    async loadGeneralSettings() {
      try {
        const api = this.getLampAPI();
        if (!api) return;
        const [general, editor] = await Promise.all([
          api.getGeneralSettings(),
          api.getEditorSettings(),
        ])

        // 归一化 locale 名称
        const language = general.language
          ? (general.language === 'zh' ? 'zh-CN' : general.language)
          : 'zh-CN';

        // 同步语言到 i18n
        const globalLocale = i18n.global.locale;
        if (typeof globalLocale === 'string') {
          i18n.global.locale = language;
        } else if (globalLocale && typeof globalLocale === 'object' && 'value' in globalLocale) {
          globalLocale.value = language;
        }

        // 同步通用设置到 Pinia store
        this.settingsStore.setGeneralSettings({
          language,
          autoSave: general.autoSave ?? general.auto_save ?? true,
          autoSaveInterval: general.autoSaveInterval ?? general.auto_save_interval ?? 30,
          restoreOnStart: general.restoreOnStart ?? general.restore_on_start ?? true,
          openLastWorkspace: general.openLastWorkspace ?? general.open_last_workspace ?? false,
          theme: general.theme ?? 'system',
        });

        // 同步编辑器设置到 Pinia store
        this.settingsStore.setEditorSettings({
          focusMode: editor?.focusMode ?? editor?.focus_mode ?? false,
        });
      } catch (error) {
        console.error('Failed to load general settings', error);
      }
    },

    // 切换资源管理器侧边面板
    toggleExplorerPanel() {
      this.explorerPanelActive = !this.explorerPanelActive;
      if (this.explorerPanelActive) {
        this.updateToolViewHeight();
      }
    },

    // 更新工具视图高度
    updateToolViewHeight() {
      this.$nextTick(() => {
        const sidebarPanel = document.querySelector('.sidebar-panel');
        if (sidebarPanel) {
          this.toolViewHeight = sidebarPanel.clientHeight - 50; // 减去header高度
        }
      });
    },

    // 切换标签页
    switchTab(index) {
      // 防御性检查
      if (!this.tabs || index < 0 || index >= this.tabs.length) {
        return;
      }
      this.activeTab = index;
    },

    // 关闭标签
    closeTab(index) {
      // 防御性检查
      if (!this.tabs || index < 0 || index >= this.tabs.length) {
        return;
      }

      // 清理该标签页的自动保存文件
      const tab = this.tabs[index];
      if (tab && tab._autoSavePath) {
        const api = this.getLampAPI();
        if (api) {
          api.delFile(tab._autoSavePath).catch(() => {});
        }
      }

      // 调整 activeTab 以适配删除后的标签页列表
      if (index < this.activeTab) {
        this.activeTab -= 1;
      } else if (index === this.activeTab) {
        // 删除的是当前激活的标签页
        if (this.tabs.length === 1) {
          // 最后一个标签页被删除，设置 activeTab 为 -1 表示没有标签页
          this.activeTab = -1;
        } else if (this.activeTab >= this.tabs.length - 1) {
          // 删除的是最后一个标签页，激活前一个
          this.activeTab = this.tabs.length - 2;
        }
        // 否则保持 activeTab 不变（指向新的下一个标签页）
      }

      // 删除指定索引的标签页
      this.tabs.splice(index, 1);
      this.$emit('close-tab', index) // 更新父组件，避免显示问题
    },

    async toggleCloseTab(index) {
      // 防御性检查
      if (!this.tabs || index < 0 || index >= this.tabs.length) {
        return;
      }
      this.closeTab(index);
    },

    handleSave() {
      if (this.indexCloseTab !== -1) {
        this.fileSave(this.indexCloseTab);
        this.closeTab(this.indexCloseTab);
        this.indexCloseTab = -1;
        this.dialogConfirmCloseTab = false;
      } else {
        console.log("Error: 处理保存并关闭时发生了错误。");
        this.dialogConfirmCloseTab = false;
      }
    },

    handleNotSave() {
      if (this.indexCloseTab !== -1) {
        this.closeTab(this.indexCloseTab);
        this.indexCloseTab = -1;
        this.dialogConfirmCloseTab = false;
      } else {
        console.log("Error: 处理不保存并关闭时发生了错误。");
        this.dialogConfirmCloseTab = false;
      }
    },

    // 另存为：向主进程发起文件另存为，主进程保存成功后返回文件保存的路径
    async saveFileAs(index) {
      // 如果 index 是事件对象或无效值，使用 this.activeTab
      const tabIndex = (typeof index === 'number') ? index : this.activeTab;

      // 使用可选链确保安全访问
      const tab = this.tabs?.[tabIndex];
      if (!tab) {
        console.warn('No tab available to save, index:', tabIndex, 'tabs:', this.tabs);
        return;
      }

      const api = this.getLampAPI();
      if (!api) return;

      // 保存时根据文件扩展名进行格式转换
      const resultPath = await api.saveFileAs(tab.title || 'untitled', tab.content || '');
      if (resultPath !== "") {
        const normalizedPath = resultPath.replace(/\\/g, '/');
        const contentToSave = this.getContentForSave(normalizedPath, tab.content);
        await api.saveInfo(normalizedPath, contentToSave);
        this.tabs[tabIndex].filePath = normalizedPath;
        this.tabs[tabIndex].title = normalizedPath.split('/').pop();
      }
    },

    // 检查文件是否存在
    async hasFile(filePath) {
      const api = this.getLampAPI();
      if (!api) return false;
      return await api.hasFile(filePath)
    },

    // 删除文件
    async delFile(filePath) {
      const api = this.getLampAPI();
      if (!api) return false;
      const result = await api.delFile(filePath)
      if (result === false) {
        console.log("Error: 在删除 " + filePath + " 文件时发生了失败。")
      }
    },

    // 检查格式与转换，Markdown 文件需要另存为
    format2html(filePath, content) {
      if (filePath.split('.').pop() === 'md') {
        return ['', marked.parse(content)]
      } else {
        return [filePath, content]
      }
    },

    // 根据文件扩展名获取要保存的内容格式
    getContentForSave(filePath, htmlContent) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (ext === 'md') {
        return this.htmlToMarkdown(htmlContent);
      } else if (ext === 'txt') {
        // 纯文本：去除 HTML 标签
        return htmlContent.replace(/<[^>]+>/g, '').trim();
      } else {
        // lmph 和 html：直接保存 HTML
        return htmlContent;
      }
    },

    // 将 HTML 转换为 Markdown
    htmlToMarkdown(htmlContent) {
      try {
        return this.simpleHtmlToMarkdown(htmlContent);
      } catch (e) {
        console.warn('Markdown serialization failed, falling back to plain text:', e);
        return htmlContent.replace(/<[^>]+>/g, '').trim();
      }
    },

    // 简单的 HTML 转 Markdown（不依赖外部库）
    simpleHtmlToMarkdown(html) {
      if (!html) return '';
      let md = html
        // 标题
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
        // 粗体和斜体
        .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
        .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        // 链接
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        // 图片
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
        .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
        // 换行和段落
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        // 无序列表
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<\/?ul[^>]*>/gi, '\n')
        // 有序列表
        .replace(/<\/?ol[^>]*>/gi, '\n')
        // 引用
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
        // 水平线
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        // 去除剩余标签
        .replace(/<[^>]+>/g, '')
        // 解码 HTML 实体
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        // 清理多余空白
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return md;
    },

    // 监听通道，接收主进程发送的内容
    initIpcRenderers() {
      const api = this.getLampAPI();
      if (!api) {
        console.warn('lampAPI is unavailable, IPC renderers are not initialized');
        return;
      }
      // 打开文件：监听主进程，被触发后接收文件路径和内容
      api.openFile((status, path, data) => {
        this.openFile(status, path, data);
      });
      // 保存文件：监听主进程，被触发后将路径和内容发送给主进程执行保存操作；若文件路径为空则另存为
      api.saveFile(() => {
        const hasActiveTab = this.activeTab >= 0 && this.activeTab < this.tabs.length;
        if (hasActiveTab && this.tabs[this.activeTab].filePath) {
          // 如果 filePath 不为空，则执行保存操作
          const filePath = this.tabs[this.activeTab].filePath;
          const fileContent = this.tabs[this.activeTab].content;
          const contentToSave = this.getContentForSave(filePath, fileContent);
          api.saveInfo(filePath, contentToSave);
        } else {
          // 否则执行另存为操作
          this.saveFileAs();
        }
      });
    },

    autoSave() {
      // 防御性检查：当没有标签页或 activeTab 无效时，不执行自动保存
      if (!this.tabs || this.tabs.length === 0 || this.activeTab < 0 || this.activeTab >= this.tabs.length) {
        return;
      }

      const currentTab = this.tabs[this.activeTab];
      if (!currentTab || !currentTab.id) {
        return;
      }

      // 标记有待保存的内容
      currentTab._hasUnsavedAutoSave = true;

      // 如果没有开启自动保存则直接返回
      if (!this.settingsStore.autoSave) {
        return;
      }

      // 清除之前的防抖计时器
      if (this._autoSaveDebounceTimer) {
        clearTimeout(this._autoSaveDebounceTimer);
      }

      // 设置新的防抖计时器
      this._autoSaveDebounceTimer = setTimeout(() => {
        this.doAutoSave();
      }, this.settingsStore.autoSaveInterval * 1000);
    },

    async doAutoSave() {
      const currentTab = this.tabs[this.activeTab];
      if (!currentTab || !currentTab.id || !currentTab._hasUnsavedAutoSave) {
        return;
      }

      const api = this.getLampAPI();
      if (!api) return;

      try {
        const autoSaveDir = await api.getAutoSaveDir();
        if (!autoSaveDir) return;

        // 文件名格式：<tabId>_<timestamp>.autosave
        const timestamp = Date.now();
        const fileName = `${currentTab.id}_${timestamp}.autosave`;
        const tempPath = `${autoSaveDir}/${fileName}`.replace(/\\/g, '/');

        // 始终以 HTML 格式保存自动保存文件（TipTap 内部格式）
        await api.saveInfo(tempPath, currentTab.content);

        // 清除旧的自动保存文件（同一标签页的旧版本）
        if (currentTab._autoSavePath) {
          const oldExists = await api.hasFile(currentTab._autoSavePath);
          if (oldExists) {
            await api.delFile(currentTab._autoSavePath);
          }
        }

        // 更新当前标签页的自动保存路径
        currentTab._autoSavePath = tempPath;
        currentTab._hasUnsavedAutoSave = false;
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    },

    async openSpecificFile(filePath) {
      if (!this.tabs) return;

      // 归一化路径为正斜杠，防止因路径格式不同（\ vs /）导致重复开 tab
      const normalizedPath = filePath.replace(/\\/g, '/');

      // 如果文件已经在标签页中，则切换到该标签页
      const existingIndex = this.tabs.findIndex(tab => tab.filePath === normalizedPath);
      if (existingIndex >= 0) {
        this.switchTab(existingIndex);
        return;
      }

      const api = this.getLampAPI();
      if (!api) return;

      const data = await api.openSpecificFile(normalizedPath);
      if (data && data[0] === 1) {
        const title = normalizedPath.split('/').pop();
        const [, fileContent] = this.format2html(normalizedPath, data[1]);
        this.tabs.push({ title, filePath: normalizedPath, content: fileContent, id: uuidv4() });
        this.activeTab = this.tabs.length - 1;
      }
    },

    // 缩放窗口后行为
    handleResize() {
      this.updateToolViewHeight();
    },

    isEditableTarget(target) {
      if (!(target instanceof Element)) return false;
      const editable = target.closest('input, textarea, [contenteditable="true"], [role="textbox"]');
      return !!editable;
    },

    hideContextMenu() {
      this.contextMenu.visible = false;
      this.contextMenu.items = [];
    },

    showContextMenu(event, items) {
      event.preventDefault();
      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        items,
      };
    },

    onContextMenuItemClick(item) {
      if (item.disabled) return;
      if (typeof item.action === 'function') item.action();
      this.hideContextMenu();
    },

    onTabContextMenu(index, event) {
      this.showContextMenu(event, [
        {
          id: 'close-current',
          label: this.$t('common.close') || '关闭',
          action: () => this.toggleCloseTab(index),
        },
      ]);
    },

    onTabBarContextMenu(event) {
      if (event.target.closest('.editor-tab')) return;
      this.showContextMenu(event, [
        {
          id: 'new-tab',
          label: this.$t('app.newLampText') || '新建',
          action: () => this.newFile(),
        },
      ]);
    },

    onSidebarContextMenu(event) {
      const pluginPanelItems = (this.pluginHost.contributions.sortedSidebarPanels || []).map((panel) => {
        const id = `plugin:${panel.pluginId || 'builtin'}:${panel.id}`;
        const checked = !this.hiddenSidebarPluginPanels.includes(id);
        return {
          id,
          label: panel.title,
          checked,
          action: () => this.toggleSidebarPluginPanel(id),
        };
      });

      this.showContextMenu(event, [
        {
          id: 'toggle-explorer',
          label: this.$t('app.explorer') || '资源管理器',
          checked: this.sidebarButtonVisibility.explorer,
          action: () => this.toggleSidebarButton('explorer'),
        },
        ...pluginPanelItems,
      ]);
    },

    toggleSidebarButton(key) {
      this.sidebarButtonVisibility[key] = !this.sidebarButtonVisibility[key];
      localStorage.setItem('lamp:ui:sidebar-buttons', JSON.stringify(this.sidebarButtonVisibility));
      if (key === 'explorer' && !this.sidebarButtonVisibility[key]) {
        this.explorerPanelActive = false;
      }
    },

    toggleSidebarPluginPanel(id) {
      const has = this.hiddenSidebarPluginPanels.includes(id);
      this.hiddenSidebarPluginPanels = has
        ? this.hiddenSidebarPluginPanels.filter((x) => x !== id)
        : [...this.hiddenSidebarPluginPanels, id];
      localStorage.setItem('lamp:ui:hidden-sidebar-plugin-panels', JSON.stringify(this.hiddenSidebarPluginPanels));
    },

    loadUiPreferences() {
      try {
        const rawButtons = localStorage.getItem('lamp:ui:sidebar-buttons');
        if (rawButtons) {
          const parsed = JSON.parse(rawButtons);
          this.sidebarButtonVisibility = {
            ...this.sidebarButtonVisibility,
            ...parsed,
          };
        }
      } catch (error) {
        console.warn('Failed to load sidebar button visibility', error);
      }

      try {
        const rawPanels = localStorage.getItem('lamp:ui:hidden-sidebar-plugin-panels');
        if (rawPanels) {
          const parsed = JSON.parse(rawPanels);
          this.hiddenSidebarPluginPanels = Array.isArray(parsed) ? parsed : [];
        }
      } catch (error) {
        console.warn('Failed to load sidebar panel visibility', error);
      }
    },

    handleGlobalContextMenu(event) {
      if (this.isDevMode) return;
      if (this.isEditableTarget(event.target)) return;
      event.preventDefault();
    },

    handleGlobalWebShortcutGuard(event) {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (ctrlOrMeta && (key === 'f' || key === 'h')) {
        event.preventDefault();
        event.stopPropagation();
        if (key === 'f') this.openSearchDialog('document')
        else this.openReplaceDialog('document')
        return;
      }
      if (this.isDevMode) return;
      const blocked =
        event.key === 'F5' ||
        event.key === 'F12' ||
        (ctrlOrMeta && key === 'r') ||
        (ctrlOrMeta && key === 'u') ||
        (ctrlOrMeta && event.shiftKey && ['i', 'j', 'c', 'r'].includes(key));

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    },

  },

  created() {
    // 等待语言加载完成后再初始化，确保翻译正确
    ; (async () => {
      await this.loadGeneralSettings()
      // 不自动创建初始标签页，让用户从空状态开始
    })()
    this.initIpcRenderers()
    this.initFileWatcher()
    this.loadUiPreferences()
    window.addEventListener('resize', this.handleResize)

    // ── Register all main menu commands with the centralized ShortcutService ──
    // Router: commandId → bound method on this component instance
    this._cmdRouter = {
      'app.newFile': () => this.newFile(),
      'app.openFile': () => this.openFileDialog(),
      'app.save': () => this.fileSave(),
      'app.saveAs': () => this.saveFileAs(),
      'app.close': () => this.closeWindow(),
      'app.undo': () => this.menuEditUndo(),
      'app.redo': () => this.menuEditRedo(),
      'app.cut': () => this.menuEditCut(),
      'app.copy': () => this.menuEditCopy(),
      'app.paste': () => this.menuEditPaste(),
      'app.selectAll': () => this.menuEditSelectAll(),
      'app.delete': () => this.menuEditDelete(),
      'app.fullScreen': () => this.viewFullScreen(),
      'app.openWorkspace': () => this.openWorkspace(),
      'app.closeWorkspace': () => this.closeWorkspace(),
      'app.find': () => this.openSearchDialog('document'),
      'app.replace': () => this.openReplaceDialog('document'),
      'app.findInWorkspace': () => this.openSearchDialog('workspace'),
    };

    // Register each command; ShortcutService handles the keydown dispatch
    for (const [id, handler] of Object.entries(this._cmdRouter)) {
      const keybinding = {
        'app.newFile': 'Ctrl+N',
        'app.openFile': 'Ctrl+O',
        'app.save': 'Ctrl+S',
        'app.saveAs': 'Ctrl+Shift+S',
        'app.close': 'Ctrl+W',
        'app.undo': 'Ctrl+Z',
        'app.redo': 'Ctrl+Y',
        'app.cut': 'Ctrl+X',
        'app.copy': 'Ctrl+C',
        'app.paste': 'Ctrl+V',
        'app.selectAll': 'Ctrl+A',
        'app.delete': 'Delete',
        'app.fullScreen': 'F11',
        'app.openWorkspace': 'Ctrl+Shift+O',
        'app.closeWorkspace': 'Ctrl+Shift+W',
        'app.find': 'Ctrl+F',
        'app.replace': 'Ctrl+H',
        'app.findInWorkspace': 'Ctrl+Shift+F',
      }[id];

      pluginHost.commandService.register('lamp.app', {
        id,
        label: `commands.${id}`,
        keybinding,
        handler,
      });
    }

  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('click', this.hideContextMenu)
    window.removeEventListener('blur', this.hideContextMenu)
    document.removeEventListener('contextmenu', this.handleGlobalContextMenu, true)
    document.removeEventListener('keydown', this.handleGlobalWebShortcutGuard, true)
    window.removeEventListener('keydown', this.handleGlobalWebShortcutGuard, true)
    if (typeof this._disposePluginThemes === 'function') {
      this._disposePluginThemes()
      this._disposePluginThemes = null
    }
    if (typeof this._disposeTheme === 'function') {
      this._disposeTheme()
      this._disposeTheme = null
    }
    // Clean up auto-save timers and files
    if (this._autoSaveDebounceTimer) {
      clearTimeout(this._autoSaveDebounceTimer);
      this._autoSaveDebounceTimer = null;
    }
    if (typeof this._cleanupAutoSave === 'function') {
      this._cleanupAutoSave();
      window.removeEventListener('beforeunload', this._cleanupAutoSave);
      this._cleanupAutoSave = null;
    }
  },

  mounted() {
    this.showDirection();
    document.addEventListener('click', this.hideContextMenu)
    window.addEventListener('blur', this.hideContextMenu)
    document.addEventListener('contextmenu', this.handleGlobalContextMenu, true)
    document.addEventListener('keydown', this.handleGlobalWebShortcutGuard, true)
    window.addEventListener('keydown', this.handleGlobalWebShortcutGuard, true)
    this._disposePluginThemes = setupPluginThemes(pluginHost)
    // Initialize VueUse shortcut polling and start listening
    const { register } = useShortcutCenter();
    pluginHost.shortcutService.setExternalRegister(register);
    pluginHost.shortcutService.startListening();

    // ── Theme ──
    this._disposeTheme = useTheme();

    // ── Auto-save recovery check ──
    this.checkRecoveryFiles();

    // ── Window close handler: clean up auto-save files on clean exit ──
    const cleanup = async () => {
      const api = this.getLampAPI();
      if (api) {
        try {
          await api.clearAutoSaveFiles();
        } catch (e) {
          console.warn('Failed to clear auto-save files:', e);
        }
      }
    };
    window.addEventListener('beforeunload', cleanup);
    this._cleanupAutoSave = cleanup;
  },

  computed: {
    contextMenuStyle() {
      return {
        left: `${this.contextMenu.x}px`,
        top: `${this.contextMenu.y}px`,
      };
    },
    hasOpenFile() {
      return this.tabs && this.tabs.length > 0;
    },
    canSave() {
      return this.hasOpenFile && this.activeTab >= 0 && this.activeTab < this.tabs.length;
    },
  },

};
</script>

<style>
.app {
  display: grid;
  grid-template-rows: auto 1fr;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.app-content {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr;
  overflow: hidden;
  height: 100%;
}

.close-button {
  background: none;
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 7px;
  font-size: 10px;
  margin-left: 4px;
  align-items: center;
  display: flex;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.close-button:hover {
  background-color: oklch(0 0 0 / 0.20);
}

.editor {
  height: 100%;
  background-color: var(--background);
  overflow: hidden;
}

.editor-tabs {
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
}

.editor-tab {
  position: relative;
  cursor: pointer;
  font-size: 12px;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  transition: background-color 0.12s;
}

.editor-tab:hover {
  background-color: oklch(0 0 0 / 0.10);
}

.editor-tab:hover .close-button {
  visibility: visible;
}

.activeTab {
  color: var(--foreground);
}

.activeTab .close-button {
  visibility: visible;
}

.active-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--primary);
  border-radius: 4px;
  transition: height 0.3s ease;
}

.ui-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 180px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--popover);
  box-shadow: 0 10px 24px color-mix(in oklab, var(--foreground) 16%, transparent);
}

.ui-context-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: none;
  background: transparent;
  color: var(--foreground);
  font-size: 13px;
  border-radius: 6px;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
}

.ui-context-item:hover:not(:disabled) {
  background: color-mix(in oklab, var(--foreground) 8%, transparent);
}

.ui-context-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-context-item .check {
  width: 14px;
  height: 14px;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: var(--foreground);
}

.ui-context-item .check-icon {
  color: var(--foreground);
  transition: opacity 0.12s ease;
}
</style>
