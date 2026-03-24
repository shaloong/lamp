<template>
  <div class="app">
    <div class="app-menu">
      <main-menu :file-open="fileOpen" :file-save="fileSave" :file-save-as="saveFileAs" :edit-undo="menuEditUndo"
        :edit-redo="menuEditRedo" :edit-cut="menuEditCut" :edit-copy="menuEditCopy" :edit-paste="menuEditPaste"
        :edit-select-all="menuEditSelectAll" :edit-delete="menuEditDelete" :view-full-screen="viewFullScreen"
        :min-window="minWindow" :max-window="maxWindow" :close-window="closeWindow" :open-settings="openSettingsDialog"
        :open-workspace="openWorkspace" :close-workspace="closeWorkspace" />
    </div>
    <div class="app-content">
      <div class="toolbar">
        <!-- 工具栏 -->
        <!-- 工具1 -->
        <button class="toggle-button" :class="{ activeToggleButton: tool1Active }" @click="toggleTool1()">
          <svg class="icon" aria-hidden="true">
            <use xlink:href="#icon-folder"></use>
          </svg>
        </button>
        <!-- 工具2 -->
        <!--        <button class="toggle-button" @click="toggleTool2()">-->
        <!--          工具2-->
        <!--        </button>-->
      </div>
      <div class="tool-view" v-show="tool1Active || tool2Active">
        <!-- 工具1操作视图 -->
        <div v-show="tool1Active" class="tool1" :class="{ active: tool1Active }" style="flex-grow: 1;">
          <!-- 工作区模式：显示文件资源管理器 -->
          <div v-if="workspaceStore.isOpen" class="file-explorer">
            <div class="workspace-header">
              <span class="workspace-name" :title="workspaceStore.rootPath">
                <svg class="workspace-icon" aria-hidden="true">
                  <use xlink:href="#icon-folder"></use>
                </svg>
                {{ workspaceStore.name }}
              </span>
            </div>
            <!-- 树状结构显示文件夹内容 -->
            <div v-if="folderContent !== ''" class="folder-tree">
              <el-tree-v2 ref="treeV2Ref" :data="folderContent" :props="treeProps" :height="toolViewHeight"
                :expanded-keys="expandedKeys" style="background-color: #F2F2F2" @node-click="handleNodeClick" />
            </div>
            <!-- 临时文件区域 -->
            <div v-if="tempFiles.length > 0" class="temp-files-section">
              <div class="section-header" @click="tempSectionExpanded = !tempSectionExpanded">
                <svg class="section-icon" :class="{ collapsed: !tempSectionExpanded }" aria-hidden="true">
                  <use xlink:href="#icon-right"></use>
                </svg>
                <span>临时打开</span>
                <span class="file-count">({{ tempFiles.length }})</span>
              </div>
              <div v-show="tempSectionExpanded" class="temp-files-list">
                <div v-for="file in tempFiles" :key="file.path" class="temp-file-item" @click="openTempFile(file)">
                  <svg class="file-icon" aria-hidden="true">
                    <use xlink:href="#icon-file"></use>
                  </svg>
                  <span class="file-name" :title="file.path">{{ file.name }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 无工作区模式：显示引导 -->
          <div v-else class="no-workspace">
            <div class="no-workspace-content">
              <p class="empty-text">当前未打开任何工作区</p>
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="openWorkspace" class="lamp-btn-primary">
                  打开工作区
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <!-- 工具2操作视图 -->
        <!--        <div v-show="tool2Active" class="tool2" :class="{ active: tool2Active }" style="flex-grow: 1;">-->
        <!--          工具2操作视图-->
        <!--        </div>-->
      </div>
      <div class="editor">
        <!-- 编辑器选项卡组 -->
        <div class="editor-tabs">
          <!-- 编辑器选项卡 -->
          <div class="editor-tab" v-for="(tab, index) in tabs" :key="index" @click="switchTab(index)"
            :class="{ activeTab: activeTab === index }">
            {{ tab.title }}
            <button class="close-button" @click.stop="toggleCloseTab(index)">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-close"></use>
              </svg>
            </button>
            <span class="active-indicator" v-show="activeTab === index"></span>
          </div>
        </div>
        <!-- 编辑器 -->
        <!--        <editor class="editor-editor" @update:modelValue="autoSave" v-model="tabs[activeTab].content"/>-->
        <editor v-for="(item, index) in tabs" class="editor-editor" v-show="item.id === tabs[activeTab].id"
          @update:modelValue="autoSave" v-model="item.content" />
      </div>
    </div>
    <div class="mask">
      <el-dialog class="lamp-dialog" v-model="dialogConfirmCloseTab" title="提示" width="500" center
        :before-close="(done) => { indexCloseTab = -1; done(); }">
        <span>您正在关闭的文件尚未保存，是否需要保存？</span>
        <template #footer>
          <div class="dialog-footer">
            <button class="lamp-btn-warning" @click="handleNotSave">
              不保存并关闭
            </button>
            <button class="lamp-btn-primary" @click="handleSave">
              保存并关闭
            </button>
          </div>
        </template>
      </el-dialog>

      <el-dialog class="lamp-dialog" v-model="dialogAiSettings" title="AI 设置" width="520" center>
        <el-form label-width="120px">
          <el-form-item label="Base URL">
            <el-input v-model="aiSettings.baseURL" placeholder="https://api.deepseek.com" />
          </el-form-item>
          <el-form-item label="Model">
            <el-input v-model="aiSettings.model" placeholder="deepseek-chat" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="aiSettings.apiKey" type="password" show-password placeholder="Secret Key" />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <button class="lamp-btn-inconspicuous" @click="dialogAiSettings = false">
              取消
            </button>
            <button class="lamp-btn-primary" :disabled="settingsSubmitting" @click="saveAiSettings">
              {{ settingsSubmitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script>
import '@/assets/iconfont.js'
import Editor from './components/Editor.vue'
import { marked } from "marked";
import { v4 as uuidv4 } from 'uuid';
import editor from "@/components/Editor.vue";
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileStore } from '@/stores/files'

// 获取父目录
function getParentDirectory(url) {
  if (url === "") {
    return url
  } else {
    const path = new URL(url).pathname;
    const parts = path.split('/');
    parts.shift();
    parts.pop(); // 移除当前文件或文件夹的名称
    if (parts.length === 0) {
      return '/'; // 如果是根目录，返回 '/'
    }
    return parts.join('/') + '/'; // 重新拼接父目录的路径
  }
}

export default {
  computed: {
    editor() {
      return editor
    }
  },
  components: {
    Editor
  },
  data() {
    return {
      tool1Active: false, // 工具1是否激活
      tool2Active: false, // 工具2是否激活
      tabs: [
        { title: '新 Lamp 文本', filePath: '', content: '', id: uuidv4() },
        // 其他标签页数据
      ],
      activeTab: 0,
      folderContent: "",
      treeProps: {
        value: 'path',
        label: 'name',
        children: 'children',
      },
      toolHeight: window.innerHeight,
      toolViewHeight: 400,
      dialogConfirmCloseTab: false,
      indexCloseTab: -1, // 删除的索引号，-1表示没有传递
      dialogAiSettings: false,
      settingsSubmitting: false,
      aiSettings: {
        baseURL: '',
        apiKey: '',
        model: '',
      },
      // 工作区相关
      tempFiles: [],
      tempSectionExpanded: true,
      expandedKeys: [],
      treeRefreshKey: 0,
    };
  },

  setup() {
    const workspaceStore = useWorkspaceStore()
    const fileStore = useFileStore()
    return {
      workspaceStore,
      fileStore
    }
  },

  methods: {
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
        window.electronAPI.saveInfo(tab.filePath, tab.content);
      } else {
        // 否则执行另存为操作
        this.saveFileAs(tabIndex)
      }
    },
    menuEditUndo() {
      window.electronAPI.menuEditUndo();
    },
    menuEditRedo() {
      window.electronAPI.menuEditRedo();
    },
    menuEditCut() {
      window.electronAPI.menuEditCut();
    },
    menuEditCopy() {
      window.electronAPI.menuEditCopy();
    },
    menuEditPaste() {
      window.electronAPI.menuEditPaste();
    },
    menuEditSelectAll() {
      window.electronAPI.menuEditSelectAll();
    },
    menuEditDelete() {
      window.electronAPI.menuEditDelete();
    },
    viewFullScreen() {
      window.electronAPI.menuViewFullScreen();
    },
    minWindow() {
      window.electronAPI.minWindow();
    },
    maxWindow() {
      window.electronAPI.maxWindow();
    },
    closeWindow() {
      window.electronAPI.closeWindow();
    },

    openSettingsDialog() {
      this.dialogAiSettings = true;
    },

    async loadAiSettings() {
      try {
        const settings = await window.electronAPI.getAiSettings();
        this.aiSettings = {
          ...this.aiSettings,
          ...settings,
        };
      } catch (error) {
        console.error('Failed to load AI settings', error);
      }
    },

    async saveAiSettings() {
      if (this.settingsSubmitting) {
        return;
      }
      this.settingsSubmitting = true;
      try {
        const payload = JSON.parse(JSON.stringify(this.aiSettings)); // IPC 之前剥离 Vue 代理 
        await window.electronAPI.saveAiSettings(payload);
        this.dialogAiSettings = false;
      } catch (error) {
        console.error('Failed to save AI settings', error);
      } finally {
        this.settingsSubmitting = false;
      }
    },

    // 工具1
    toggleTool1() {
      this.tool1Active = !this.tool1Active;
      if (this.tool1Active) {
        this.updateToolViewHeight();
      }
    },

    // 更新工具视图高度
    updateToolViewHeight() {
      this.$nextTick(() => {
        const toolView = document.querySelector('.tool-view');
        if (toolView) {
          this.toolViewHeight = toolView.clientHeight - 50; // 减去header高度
        }
      });
    },

    // 打开工作区（选择文件夹）
    async openWorkspace() {
      try {
        const result = await window.electronAPI.openWorkspace()
        if (result) {
          this.workspaceStore.setWorkspace({
            workspacePath: '',  // 不需要配置文件
            rootPath: result.rootPath,
            name: result.name,
            settings: {}
          })
          // 加载工作区根目录内容
          if (result.rootPath) {
            this.showDirection(result.rootPath)
            // 开始监视文件夹
            await window.electronAPI.startWatching(result.rootPath)
          }
          // 清空临时文件
          this.tempFiles = []
        }
      } catch (error) {
        console.error('打开工作区失败:', error)
      }
    },

    // 关闭工作区
    async closeWorkspace() {
      // 停止监视
      await window.electronAPI.stopWatching()
      this.workspaceStore.clearWorkspace()
      this.fileStore.clearAll()
      this.folderContent = ''
      this.tempFiles = []
    },

    // 初始化文件变化监听
    initFileWatcher() {
      window.electronAPI.onFileChange((event) => {
        console.log('文件变化:', event)
        // 有变化时自动刷新文件树（使用 refresh 模式保留展开状态）
        if (this.workspaceStore.isOpen && this.workspaceStore.rootPath) {
          this.showDirection(this.workspaceStore.rootPath, 'refresh')
        }
      })
    },

    // 打开临时文件
    async openTempFile(file) {
      await this.openSpecificFile(file.path)
    },

    // 转换为树结构
    convertToTree(folderContent) {
      const tree = [];
      for (const item of folderContent) {
        const node = {
          name: item.name,
          path: item.path,
        };
        if (item.children && item.children.length > 0) {
          node.children = this.convertToTree(item.children);
        }
        tree.push(node);
      }
      return tree;
    },

    // 展示目录结构
    // mode: 'normal' | 'refresh'  - refresh 模式会保留展开状态
    showDirection(path, mode = 'normal') {
      // 防御性检查
      if (!this.tabs || this.tabs.length === 0 || !this.tabs[this.activeTab]) {
        this.folderContent = "";
        return;
      }

      // 如果没有传入 path，则使用默认值
      if (path === undefined) {
        path = getParentDirectory(this.tabs[this.activeTab].filePath);
      }

      // 保存当前展开的文件夹路径（相对于工作区根目录）
      let expandedRelativePaths = [];
      if (mode === 'refresh' && this.folderContent && this.workspaceStore.rootPath) {
        expandedRelativePaths = this.collectExpandedRelativePaths(this.folderContent, this.workspaceStore.rootPath);
      }

      if (path !== "") {
        window.electronAPI.getFolderContent(path).then(result => {
          this.folderContent = this.convertToTree(result);

          // 恢复展开状态
          if (mode === 'refresh' && expandedRelativePaths.length > 0) {
            this.$nextTick(() => {
              this.restoreExpandedByRelativePaths(this.folderContent, expandedRelativePaths, this.workspaceStore.rootPath);
            });
          }
        }).catch(error => {
          // 处理错误
          console.error(error);
          this.folderContent = "";
        });
      } else {
        this.folderContent = "";
      }
    },

    // 收集展开的文件夹相对路径
    collectExpandedRelativePaths(tree, rootPath) {
      const paths = [];
      const collect = (nodes) => {
        for (const node of nodes) {
          if (node.isDirectory && this.fileStore.isExpanded(node.path)) {
            // 转换为相对路径
            const relativePath = this.getRelativePath(node.path, rootPath);
            paths.push(relativePath);
          }
          if (node.children) {
            collect(node.children);
          }
        }
      };
      collect(tree || []);
      return paths;
    },

    // 获取相对路径
    getRelativePath(fullPath, rootPath) {
      const normalizedFull = fullPath.replace(/\\/g, '/');
      const normalizedRoot = rootPath.replace(/\\/g, '/');
      if (normalizedFull.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
        return normalizedFull.substring(normalizedRoot.length).replace(/^\//, '');
      }
      return normalizedFull;
    },

    // 根据相对路径恢复展开状态
    restoreExpandedByRelativePaths(tree, relativePaths, rootPath) {
      if (!tree || !relativePaths) return;

      const newExpandedKeys = [];
      const restore = (nodes) => {
        for (const node of nodes) {
          const relativePath = this.getRelativePath(node.path, rootPath);
          if (relativePaths.includes(relativePath)) {
            newExpandedKeys.push(node.path);
          }
          if (node.children) {
            restore(node.children);
          }
        }
      };
      restore(tree);

      // 更新展开状态
      this.expandedKeys = newExpandedKeys;
      // 同步到 fileStore
      this.fileStore.expandedFolders = new Set(newExpandedKeys);
    },

    // 工具2
    toggleTool2() {
      this.tool2Active = !this.tool2Active;
      // 视窗1调整
      if (window.innerHeight != null) {
        if (this.tool2Active === false) {
          this.toolHeight = window.innerHeight;
        } else {
          this.toolHeight = window.innerHeight / 2;
        }
      }
    },

    // 切换标签页
    switchTab(index) {
      // 防御性检查
      if (!this.tabs || index < 0 || index >= this.tabs.length) {
        return;
      }
      this.activeTab = index;
      this.showDirection();
    },

    // 关闭标签
    closeTab(index) {
      // 防御性检查
      if (!this.tabs || index < 0 || index >= this.tabs.length) {
        return;
      }

      // 如果当前标签页数量大于1
      if (this.tabs.length > 1) {
        // 如果删除的标签页是激活的标签页之前的标签页
        if (index < this.activeTab) {
          this.activeTab -= 1;
        } else if (index === this.activeTab) {
          // 如果删除的是当前激活的标签页，则将 activeTab 设置为前一个标签页的索引
          if (this.activeTab !== 0) {
            this.activeTab -= 1
          }
        }
      } else {
        // 如果当前标签页数量为1，则先添加一个新的标签页，并将 activeTab 设置为0
        this.tabs.push({ title: '新 Lamp 文本', filePath: '', content: '', id: uuidv4() });
        this.activeTab = 0;
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

      const result = await this.hasFile(this.tabs[index].filePath + '.lampsave');
      if (result) {
        this.dialogConfirmCloseTab = true;
        this.indexCloseTab = index;
      } else {
        this.closeTab(index);
      }
    },

    handleSave() {
      if (this.indexCloseTab !== -1) {
        this.fileSave(this.indexCloseTab);
        this.delFile(this.tabs[this.indexCloseTab].filePath + '.lampsave');
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
        this.delFile(this.tabs[this.indexCloseTab].filePath + '.lampsave');
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

      const resultPath = await window.electronAPI.saveFileAs(tab.title || 'untitled', tab.content || '')
      if (resultPath !== "") {
        this.tabs[tabIndex].filePath = resultPath
        this.tabs[tabIndex].title = this.tabs[tabIndex].filePath.split('\\').pop()
        const result = await this.hasFile(this.tabs[tabIndex].filePath + '.lampsave');
        if (result) {
          this.delFile(this.tabs[tabIndex].filePath + '.lampsave') // 删除自动保存的文件
        }
      }
    },

    // 检查文件是否存在
    async hasFile(filePath) {
      return await window.electronAPI.hasFile(filePath)
    },

    // 删除文件
    async delFile(filePath) {
      const result = await window.electronAPI.delFile(filePath)
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

    // 监听通道，接收主进程发送的内容
    initIpcRenderers() {
      // 保存文件：监听主进程，被触发后将路径和内容发送给主进程执行保存操作；若文件路径为空则另存为
      window.electronAPI.saveFile(() => {
        if (this.activeTab !== null && this.tabs[this.activeTab].filePath) {
          // 如果 filePath 不为空，则执行保存操作
          const filePath = this.tabs[this.activeTab].filePath;
          const fileContent = this.tabs[this.activeTab].content;
          window.electronAPI.saveInfo(filePath, fileContent);
          const result = this.hasFile(this.tabs[index].filePath + '.lampsave');
          if (result) {
            this.delFile(this.tabs[this.activeTab].filePath + '.lampsave') // 删除自动保存的文件
          }
        } else {
          // 否则执行另存为操作
          this.saveFileAs();
        }
      });
    },

    autoSave() {
      // 防御性检查
      if (!this.tabs || this.tabs.length === 0 || !this.tabs[this.activeTab]) {
        return;
      }

      const currentTab = this.tabs[this.activeTab];
      if (currentTab && currentTab.filePath && currentTab.filePath !== '' && currentTab.filePath.split('.').pop() !== 'lampsave') {
        window.electronAPI.saveInfo(currentTab.filePath + '.lampsave', currentTab.content)
      }
    },

    async openSpecificFile(filePath) {
      // 防御性检查
      if (!this.tabs) {
        return;
      }

      if ((filePath !== '') && (this.tabs.some(tab => tab.filePath === filePath))) {
        this.switchTab(this.tabs.findIndex(tab => tab.filePath === filePath))
      } else {
        const data = await window.electronAPI.openSpecificFile(filePath)
        if (data && data[0] === 1) {
          const title = filePath.split('\\').pop()
          const { filePath, fileContent } = this.format2html(filePath, data[1]) // 格式转换
          this.tabs.push({ title: title, filePath: filePath, content: fileContent, id: uuidv4() });
        }
      }
    },

    // 缩放窗口后行为
    handleResize() {
      if (window.innerHeight != null) {
        if (this.tool2Active === false) {
          this.toolHeight = window.innerHeight;
        } else {
          this.toolHeight = window.innerHeight / 2;
        }
      }
    },

    handleNodeClick(data, node) {
      const filePath = node.key;

      // 如果是目录，切换展开状态
      if (data.isDirectory) {
        if (this.expandedKeys.includes(filePath)) {
          // 折叠
          this.expandedKeys = this.expandedKeys.filter(k => k !== filePath);
        } else {
          // 展开
          this.expandedKeys = [...this.expandedKeys, filePath];
        }
        // 同步到 fileStore
        this.fileStore.expandedFolders = new Set(this.expandedKeys);
        return;
      }

      // 检查文件是否在工作区内
      if (this.workspaceStore.isOpen) {
        const isInWorkspace = this.fileStore.isFileInWorkspace(filePath, this.workspaceStore.rootPath);
        if (!isInWorkspace) {
          // 添加到临时文件
          const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
          const exists = this.tempFiles.some(f => f.path === filePath);
          if (!exists) {
            this.tempFiles.push({ name: fileName, path: filePath });
          }
        }
      }
      this.openSpecificFile(filePath);
    },

  },

  created() {
    this.initIpcRenderers();
    this.initFileWatcher();
    window.addEventListener('resize', this.handleResize);
    this.loadAiSettings();
  },

  mounted() {
    this.showDirection();
  },

};
</script>

<style lang="scss" scoped>
@use "styles/style" as *;

.app {
  display: grid;
  grid-template-rows: auto 1fr;
  width: 100vw;
  height: 100vh;
  margin: 0;
}

.app-menu {
  grid-row: 1;
}

.app-content {
  grid-row: 2;
  position: relative;
  margin-top: 38px;
  overflow: hidden;
  /* 保证内容溢出时不会影响父元素布局 */
  display: grid;
  grid-template-columns: auto auto 1fr;
}

.toolbar {
  position: relative;
  width: 42px;
  /* 工具栏的固定宽度 */
  flex-shrink: 0;
  background-color: rgba($lamp-color-neutral-grey, 0.1);
  border-right: 1px solid rgba($lamp-color-neutral-dark, 0.1);
}

.toggle-button {
  align-items: center;
  /* 垂直居中 */
  justify-content: center;
  /* 水平居中 */
  margin: 6px 4px 6px 4px;
  width: 32px;
  height: 32px;
  overflow: hidden;
  background-color: transparent;

  /* 确保SVG不会超出按钮 */
  .icon {
    width: 20px;
    height: 20px;
  }
}

.activeToggleButton {
  border-color: $lamp-color-primary;
}

.close-button {
  background: none;
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 7px;
  font-size: 10px;
  align-items: center;

  .icon {
    width: 8px;
    height: 8px;
  }
}

.close-button:hover {
  background-color: rgba($lamp-color-neutral-grey, 0.2)
}

.tool-view {
  width: 300px;
  /* 操作视图宽度 */
  display: flex;
  /* 设置为 flex 布局 */
  flex-direction: column;
  background-color: rgba($lamp-color-neutral-grey, 0.1);
}

.tool1 {
  font-size: 12px;
  text-align: left;
}

.editor {
  grid-column: 3 / 4;
  height: calc(100vh - 42px);
  margin-right: 5px;
  background-color: $lamp-color-neutral-light;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.editor-tabs {
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid #ccc;
}

.editor-editor {
  grid-row: 2;
}

.editor-tab {
  height: 22px;
  position: relative;
  margin: 0 0 0 0;
  padding: 6px 10px 4px 14px;
  cursor: pointer;
  font-size: 12px;
  color: $lamp-color-neutral-grey;
  display: flex;
  align-items: center;

  .close-button {
    margin-left: 4px;
    visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.activeTab {
  color: $lamp-color-neutral-dark;
  border: 0 0 3px 0 $lamp-color-primary;

  .close-button {
    margin-left: 4px;
    visibility: visible;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.active-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: $lamp-color-primary;
  border-radius: 4px;
  transition: height 0.3s ease;
}

.editor-tab:hover {
  background-color: rgba($lamp-color-neutral-grey, 0.1);

  .close-button {
    visibility: visible;
  }
}

// 工作区样式
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.workspace-header {
  padding: 8px 12px;
  border-bottom: 1px solid rgba($lamp-color-neutral-grey, 0.15);
  background-color: rgba($lamp-color-neutral-grey, 0.05);
}

.workspace-name {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: $lamp-color-neutral-dark;

  .workspace-icon {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    color: $lamp-color-primary;
  }
}

.folder-tree {
  flex: 1;
  overflow-y: auto;
}

.temp-files-section {
  border-top: 1px solid rgba($lamp-color-neutral-grey, 0.15);
  background-color: rgba($lamp-color-neutral-grey, 0.03);
  max-height: 150px;
  overflow-y: auto;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: $lamp-color-neutral-grey;
  cursor: pointer;

  &:hover {
    background-color: rgba($lamp-color-neutral-grey, 0.08);
  }

  .section-icon {
    width: 10px;
    height: 10px;
    margin-right: 4px;
    transition: transform 0.15s ease;

    &.collapsed {
      transform: rotate(0deg);
    }

    &:not(.collapsed) {
      transform: rotate(90deg);
    }
  }

  .file-count {
    margin-left: 4px;
    opacity: 0.7;
  }
}

.temp-files-list {
  padding: 4px 0;
}

.temp-file-item {
  display: flex;
  align-items: center;
  padding: 4px 12px 4px 24px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background-color: rgba($lamp-color-neutral-grey, 0.1);
  }

  .file-icon {
    width: 14px;
    height: 14px;
    margin-right: 6px;
    color: $lamp-color-neutral-grey;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $lamp-color-neutral-dark;
  }
}

.no-workspace {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 20px 0 20px;
}

.no-workspace-content {
  text-align: center;
}

.empty-text {
  font-size: 14px;
  color: $lamp-color-neutral-grey;
  margin-bottom: 20px;
}
</style>