<template>
  <div class="app">
    <div class="app-menu">
      <main-menu :file-open="fileOpen" :file-save="fileSave" :file-save-as="saveFileAs" :edit-undo="menuEditUndo"
        :edit-redo="menuEditRedo" :edit-cut="menuEditCut" :edit-copy="menuEditCopy" :edit-paste="menuEditPaste"
        :edit-select-all="menuEditSelectAll" :edit-delete="menuEditDelete" :view-full-screen="viewFullScreen"
        :min-window="minWindow" :max-window="maxWindow" :close-window="closeWindow"
        :open-settings="openSettingsDialog" />
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
          <!-- 树状结构显示文件夹内容 -->
          <div v-if="folderContent !== ''">
            <el-tree-v2 :data="folderContent" :props="treeProps" :height=toolHeight style="background-color: #F2F2F2"
              @node-click="handleNodeClick" />
          </div>
          <div v-else>
            <!-- 当前文件夹为空 -->
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
      dialogConfirmCloseTab: false,
      indexCloseTab: -1, // 删除的索引号，-1表示没有传递
      dialogAiSettings: false,
      settingsSubmitting: false,
      aiSettings: {
        baseURL: '',
        apiKey: '',
        model: '',
      },
    };
  },

  methods: {
    // 主菜单栏操作
    fileOpen() {
      window.electronAPI.menuFileOpen();
    },
    fileSave(index = this.activeTab) {
      if (this.activeTab !== null && this.tabs[index].filePath) {
        // 如果 filePath 不为空，则执行保存操作
        const { filePath, content } = this.tabs[index];
        window.electronAPI.saveInfo(filePath, content);
      } else {
        // 否则执行另存为操作
        this.saveFileAs(index)
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
    showDirection(path = getParentDirectory(this.tabs[this.activeTab].filePath)) {
      if (path !== "") {
        window.electronAPI.getFolderContent(path).then(result => {
          this.folderContent = this.convertToTree(result);
        }).catch(error => {
          // 处理错误
          console.error(error);
          this.folderContent = "";
        });
      } else {
        this.folderContent = "";
      }
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
      this.activeTab = index;
      this.showDirection();
    },

    // 关闭标签
    closeTab(index) {
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
    async saveFileAs(index = this.activeTab) {
      const resultPath = await window.electronAPI.saveFileAs(this.tabs[index].title, this.tabs[index].content)
      if (resultPath !== "") {
        this.tabs[index].filePath = resultPath
        this.tabs[index].title = this.tabs[index].filePath.split('\\').pop()
        const result = await this.hasFile(this.tabs[index].filePath + '.lampsave');
        if (result) {
          this.delFile(this.tabs[index].filePath + '.lampsave') // 删除自动保存的文件
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
      // 打开文件：接收主进程发送的打开状态、路径、文件内容，在Vue中新建对应标签页
      window.electronAPI.openFile((status, path, data) => {
        if (status === 0) {
          var fileName = path.split('\\').pop(); // 截取文件名
          const result = this.format2html(path, data); // 格式转换
          if (result[0] === '') {
            // 不支持直接保存的文件修改后缀名
            fileName = fileName.split('.').slice(0, -1).join('.') + '.lamp'
          }
          if ((result[0] !== '') && (this.tabs.some(tab => tab.filePath === result[0]))) {
            this.switchTab(this.tabs.findIndex(tab => tab.filePath === result[0]))
          } else {
            this.tabs.push({ title: fileName, filePath: result[0], content: result[1] || '', id: uuidv4() }); // 创建标签页
            this.switchTab(this.tabs.length - 1); // 切换标签页
          }
        } else {
          console.log("读取失败");
        }
      });

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
      if ((this.tabs[this.activeTab].filePath !== '') && (this.tabs[this.activeTab].filePath.split('.').pop() !== 'lampsave')) {
        window.electronAPI.saveInfo(this.tabs[this.activeTab].filePath + '.lampsave', this.tabs[this.activeTab].content)
      }
    },

    async openSpecificFile(filePath) {
      if ((filePath !== '') && (this.tabs.some(tab => tab.filePath === filePath))) {
        this.switchTab(this.tabs.findIndex(tab => tab.filePath === filePath))
      } else {
        const data = await window.electronAPI.openSpecificFile(filePath)
        if (data[0] === 1) {
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
      this.openSpecificFile(node.key);
    },

  },

  created() {
    this.initIpcRenderers();
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
  margin-top: 40px;
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
  background-color: $lamp-color-neutral-light;
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
  margin: 2px 0 0 0;
  padding: 3px 10px 4px 14px;
  cursor: pointer;
  font-size: 12px;
  color: $lamp-color-neutral-grey;

  .close-button {
    visibility: hidden;
  }
}

.activeTab {
  color: $lamp-color-neutral-dark;
  border: 0 0 3px 0 $lamp-color-primary;

  .close-button {
    visibility: visible;
  }
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  /* 或者根据需要设置合适的高度 */
  background-color: $lamp-color-primary;
  /* 设置合适的颜色 */
  border-radius: 4px;
  /* 圆角边框 */
  transition: height 0.3s ease;
  /* 添加过渡效果 */
}

.editor-tab:hover {
  color: $lamp-color-primary;

  .close-button {
    visibility: visible;
  }
}
</style>