# LAMP 工作区功能实现计划

## 执行模式建议

建议使用 **Code 模式** 按顺序执行以下任务。每个任务都有明确的前置依赖和验收标准。

---

## Phase 1: 基础设施搭建

### 任务 1.1: 安装 Pinia 状态管理库

**文件**: `package.json`

**操作**:
- 添加 `pinia` 依赖: `pnpm add pinia`
- 如果需要持久化，添加 `pinia-plugin-persistedstate`

**验收标准**:
- `node_modules` 中包含 pinia
- 可以在 `src/main.js` 中引入并使用

---

### 任务 1.2: 创建工作区状态管理 Store

**新建文件**: `src/stores/workspace.js`

**内容要求**:
```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useWorkspaceStore = defineStore('workspace', () => {
  // 状态
  const isOpen = ref(false);
  const workspacePath = ref('');
  const rootPath = ref('');
  const name = ref('');
  const settings = ref({});
  const recentWorkspaces = ref([]);

  // 计算属性
  const isWorkspaceMode = computed(() => isOpen.value);
  
  // 方法
  function setWorkspace(config) {
    isOpen.value = true;
    workspacePath.value = config.workspacePath;
    rootPath.value = config.rootPath;
    name.value = config.name;
    settings.value = config.settings || {};
  }

  function clearWorkspace() {
    isOpen.value = false;
    workspacePath.value = '';
    rootPath.value = '';
    name.value = '';
    settings.value = {};
  }

  return {
    isOpen,
    workspacePath,
    rootPath,
    name,
    settings,
    recentWorkspaces,
    isWorkspaceMode,
    setWorkspace,
    clearWorkspace,
  };
});
```

**验收标准**:
- `src/stores/workspace.js` 文件存在
- 可以通过 `useWorkspaceStore()` 获取状态

---

### 任务 1.3: 创建文件状态管理 Store

**新建文件**: `src/stores/files.js`

**内容要求**:
```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFileStore = defineStore('files', () => {
  // 状态
  const tree = ref([]);
  const workspaceFiles = ref([]);  // 工作区文件路径列表
  const tempFiles = ref([]);       // 临时文件路径列表
  const expandedFolders = ref(new Set());

  // 计算属性 - 合并显示所有文件
  const allFiles = computed(() => {
    return [
      ...workspaceFiles.value.map(f => ({ ...f, isTemp: false })),
      ...tempFiles.value.map(f => ({ ...f, isTemp: true }))
    ];
  });

  // 方法
  function setFileTree(data) {
    tree.value = data;
  }

  function addTempFile(file) {
    if (!tempFiles.value.find(f => f.path === file.path)) {
      tempFiles.value.push(file);
    }
  }

  function addWorkspaceFile(file) {
    if (!workspaceFiles.value.find(f => f.path === file.path)) {
      workspaceFiles.value.push(file);
    }
  }

  function toggleFolder(path) {
    if (expandedFolders.value.has(path)) {
      expandedFolders.value.delete(path);
    } else {
      expandedFolders.value.add(path);
    }
  }

  function isExpanded(path) {
    return expandedFolders.value.has(path);
  }

  function clearAll() {
    tree.value = [];
    workspaceFiles.value = [];
    tempFiles.value = [];
    expandedFolders.value.clear();
  }

  return {
    tree,
    workspaceFiles,
    tempFiles,
    allFiles,
    expandedFolders,
    setFileTree,
    addTempFile,
    addWorkspaceFile,
    toggleFolder,
    isExpanded,
    clearAll,
  };
});
```

**验收标准**:
- `src/stores/files.js` 文件存在
- 包含文件树、工作区文件、临时文件的状态管理

---

### 任务 1.4: 修改 main.js 集成 Pinia

**修改文件**: `src/main.js`

**变更内容**:
```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)
app.mount('#app')
```

**验收标准**:
- 应用正常启动，控制台无 Pinia 相关错误

---

## Phase 2: UI 组件开发

### 任务 2.1: 创建侧边栏容器组件

**新建文件**: `src/components/Sidebar.vue`

**功能要求**:
- 接收 `workspaceStore` 状态
- 工作区模式：显示文件资源管理器
- 无工作区模式：显示"打开工作区"引导

**核心代码结构**:
```vue
<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span>文件资源管理器</span>
    </div>
    
    <!-- 工作区模式 -->
    <div v-if="workspaceStore.isOpen" class="file-explorer">
      <div class="workspace-name">
        {{ workspaceStore.name }}
      </div>
      <FileTree :data="fileStore.tree" @node-click="handleFileClick" />
    </div>
    
    <!-- 无工作区模式 -->
    <div v-else class="no-workspace">
      <p>当前未打开任何工作区</p>
      <el-button type="primary" @click="openWorkspace">打开工作区</el-button>
      <el-button @click="openFile">打开文件</el-button>
    </div>
  </div>
</template>

<script setup>
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileStore } from '@/stores/files'
import FileTree from './FileTree.vue'

const workspaceStore = useWorkspaceStore()
const fileStore = useFileStore()

// TODO: 实现打开工作区和文件的方法
</script>
```

**验收标准**:
- 侧边栏组件正常渲染
- 可以切换显示/隐藏

---

### 任务 2.2: 创建文件树组件

**新建文件**: `src/components/FileTree.vue`

**功能要求**:
- 递归渲染目录结构
- 支持展开/折叠文件夹
- 点击文件触发事件
- 为临时文件添加特殊样式标识

**核心代码结构**:
```vue
<template>
  <div class="file-tree">
    <div 
      v-for="node in data" 
      :key="node.path"
      class="tree-node"
      :class="{ 'is-directory': node.isDirectory, 'is-temp': node.isTemp }"
    >
      <div class="node-content" @click="handleClick(node)">
        <span class="node-icon">
          {{ node.isDirectory ? (isExpanded(node.path) ? '📂' : '📁') : '📄' }}
        </span>
        <span class="node-name">{{ node.name }}</span>
      </div>
      
      <!-- 临时文件标识 -->
      <span v-if="node.isTemp" class="temp-badge">临时</span>
      
      <!-- 递归子节点 -->
      <div v-if="node.isDirectory && isExpanded(node.path) && node.children" class="tree-children">
        <FileTree 
          :data="node.children" 
          :is-temp="isTemp"
          @node-click="$emit('nodeClick', $event)" 
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFileStore } from '@/stores/files'

const props = defineProps({
  data: { type: Array, default: () => [] },
  isTemp: { type: Boolean, default: false }
})

const emit = defineEmits(['nodeClick'])
const fileStore = useFileStore()

function isExpanded(path) {
  return fileStore.isExpanded(path)
}

function handleClick(node) {
  if (node.isDirectory) {
    fileStore.toggleFolder(path)
  } else {
    emit('nodeClick', node)
  }
}
</script>
```

**验收标准**:
- 可以正确渲染目录树
- 文件夹可以展开/折叠
- 临时文件有特殊标识

---

### 任务 2.3: 创建状态栏组件

**新建文件**: `src/components/StatusBar.vue`

**功能要求**:
- 显示工作区名称（工作区模式）
- 显示当前文件信息（行:列、编码）
- 显示编辑器状态

```vue
<template>
  <div class="status-bar">
    <div class="status-left">
      <span v-if="workspaceStore.isOpen" class="workspace-name">
        {{ workspaceStore.name }}
      </span>
      <span v-else class="no-workspace">临时编辑器</span>
    </div>
    <div class="status-right">
      <span class="file-info">Ln {{ line }}, Col {{ column }}</span>
      <span class="encoding">UTF-8</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'

const workspaceStore = useWorkspaceStore()
const line = ref(1)
const column = ref(1)
</script>
```

**验收标准**:
- 工作区模式显示工作区名称
- 无工作区模式显示"临时编辑器"

---

## Phase 3: 后端 API 扩展

### 任务 3.1: 添加工作区相关 Rust 命令

**修改文件**: `src-tauri/src/lib.rs`

**新增命令**:
```rust
// 工作区配置结构
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub name: String,
    #[serde(rename = "rootPath")]
    pub root_path: String,
    pub files: Vec<String>,
    #[serde(rename = "openFiles")]
    pub open_files: Vec<String>,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentWorkspace {
    pub name: String,
    pub path: String,
}

// 打开工作区
#[tauri::command]
async fn open_workspace(path: String) -> Result<WorkspaceConfig, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: WorkspaceConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

// 保存工作区
#[tauri::command]
async fn save_workspace(path: String, config: WorkspaceConfig) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// 检查文件是否在工作区内
#[tauri::command]
async fn is_file_in_directory(file_path: String, dir_path: String) -> Result<bool, String> {
    let file = PathBuf::from(&file_path);
    let dir = PathBuf::from(&dir_path);
    
    // 规范化路径后比较
    let file_canonical = file.canonicalize().map_err(|e| e.to_string())?;
    let dir_canonical = dir.canonicalize().map_err(|e| e.to_string())?;
    
    Ok(file_canonical.starts_with(dir_canonical))
}

// 获取最近工作区
#[tauri::command]
fn get_recent_workspaces() -> Result<Vec<RecentWorkspace>, String> {
    // 从配置文件中读取最近工作区列表
    // ... 实现略
}
```

**验收标准**:
- Rust 编译通过
- 新增命令可通过 `invoke` 调用

---

### 任务 3.2: 添加前端 API 封装

**修改文件**: `src-tauri/src/preload.js`

**新增 API**:
```javascript
window.electronAPI = {
  // ... 现有 API ...

  // ==================== 工作区操作 ====================
  // 打开工作区
  openWorkspace: async () => {
    const result = await open({
      filters: [{ name: 'LAMP Workspace', extensions: ['lamp-workspace'] }],
    });
    if (result) {
      const config = await invoke('open_workspace', { path: result });
      return config;
    }
    return null;
  },

  // 保存工作区
  saveWorkspace: async (workspacePath, config) => {
    return await invoke('save_workspace', { path: workspacePath, config });
  },

  // 检查文件是否在工作区内
  isFileInDirectory: async (filePath, dirPath) => {
    return await invoke('is_file_in_directory', { filePath, dirPath });
  },

  // 获取最近工作区
  getRecentWorkspaces: () => invoke('get_recent_workspaces'),
};
```

**验收标准**:
- `window.electronAPI.openWorkspace()` 可正常调用
- 返回正确的工作区配置

---

## Phase 4: 菜单栏改造

### 任务 4.1: 修改主菜单组件

**修改文件**: `src/components/MainMenu.vue`

**新增菜单项**:

```vue
<template>
  <!-- 文件菜单 -->
  <el-sub-menu index="file">
    <template #title>文件</template>
    <el-menu-item @click="newFile">新建</el-menu-item>
    <el-menu-item @click="openFile">打开文件...</el-menu-item>
    <!-- 新增工作区菜单 -->
    <el-menu-item @click="openWorkspace" v-if="!workspaceStore.isOpen">
      打开工作区...
    </el-menu-item>
    <el-menu-item @click="addToWorkspace" v-if="workspaceStore.isOpen">
      将文件添加到工作区
    </el-menu-item>
    <el-menu-item @click="closeWorkspace" v-if="workspaceStore.isOpen">
      关闭工作区
    </el-menu-item>
    <el-divider />
    <el-menu-item @click="saveFile">保存</el-menu-item>
    <el-menu-item @click="saveFileAs">另存为...</el-menu-item>
    <el-menu-item @click="closeWindow">关闭</el-menu-item>
  </el-sub-menu>
</template>

<script setup>
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileStore } from '@/stores/files'

const workspaceStore = useWorkspaceStore()
const fileStore = useFileStore()

const openWorkspace = async () => {
  const config = await window.electronAPI.openWorkspace()
  if (config) {
    workspaceStore.setWorkspace({
      workspacePath: /* 当前选择的路径 */,
      rootPath: config.rootPath,
      name: config.name,
      settings: config.settings,
    })
    // 加载工作区文件树
    const tree = await window.electronAPI.getFolderContent(config.rootPath)
    fileStore.setFileTree(tree)
  }
}

const closeWorkspace = () => {
  workspaceStore.clearWorkspace()
  fileStore.clearAll()
}
</script>
```

**验收标准**:
- 菜单显示正确
- 点击"打开工作区"可以加载工作区

---

## Phase 5: App.vue 主视图改造

### 任务 5.1: 重构 App.vue 布局

**修改文件**: `src/App.vue`

**核心变更**:
1. 移除现有的工具栏 toggle 逻辑
2. 左侧固定显示 Sidebar 组件
3. 底部添加 StatusBar 组件
4. 根据 `workspaceStore.isOpen` 状态渲染不同视图

```vue
<template>
  <div class="app">
    <!-- 菜单栏 -->
    <MainMenu />
    
    <div class="app-content">
      <!-- 左侧侧边栏 -->
      <Sidebar 
        class="sidebar"
        @file-open="handleFileOpen"
        @workspace-open="handleWorkspaceOpen"
      />
      
      <!-- 编辑器区域 -->
      <div class="editor-area">
        <EditorTabs />
        <Editor />
      </div>
    </div>
    
    <!-- 状态栏 -->
    <StatusBar />
  </div>
</template>

<script setup>
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileStore } from '@/stores/files'
import Sidebar from '@/components/Sidebar.vue'
import StatusBar from '@/components/StatusBar.vue'

const workspaceStore = useWorkspaceStore()
const fileStore = useFileStore()

// 处理文件打开
const handleFileOpen = async (filePath) => {
  // TODO: 实现文件打开逻辑
}

// 处理工作区打开
const handleWorkspaceOpen = async (config) => {
  workspaceStore.setWorkspace(config)
  const tree = await window.electronAPI.getFolderContent(config.rootPath)
  fileStore.setFileTree(tree)
}
</script>

<style lang="scss" scoped>
.app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
}

.app-content {
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
```

**验收标准**:
- 左侧显示 Sidebar
- 底部显示 StatusBar
- 可以打开工作区并显示文件树

---

## Phase 6: 现有逻辑迁移与整合

### 任务 6.1: 迁移现有 Tab 逻辑

**操作**:
1. 将 `App.vue` 中现有的 tabs、activeTab 相关逻辑迁移到新的 Store
2. 创建 `src/stores/tabs.js`

```javascript
// src/stores/tabs.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export const useTabStore = defineStore('tabs', () => {
  const tabs = ref([
    { title: '新 Lamp 文本', filePath: '', content: '', id: uuidv4() }
  ]);
  const activeTab = ref(0);

  // 方法
  function addTab(tab) { /* ... */ }
  function closeTab(index) { /* ... */ }
  function switchTab(index) { /* ... */ }
  function updateTabContent(index, content) { /* ... */ }

  return { tabs, activeTab, addTab, closeTab, switchTab, updateTabContent };
});
```

---

### 任务 6.2: 整合文件打开逻辑

**操作**:
在 Sidebar 和 FileTree 中点击文件时，调用 Tab Store 添加 Tab。

```javascript
const handleFileClick = async (node) => {
  if (!node.isDirectory) {
    // 添加到 Tab
    tabStore.addTab({
      title: node.name,
      filePath: node.path,
      content: fileContent,
      id: uuidv4()
    });
  }
};
```

---

## 验收测试清单

完成所有任务后，进行以下验证：

| 序号 | 测试项 | 预期结果 |
|------|--------|----------|
| 1 | 启动应用 | 应用正常启动，无报错 |
| 2 | 打开工作区 | 可以选择 .lamp-workspace 文件并加载 |
| 3 | 显示文件树 | 左侧显示工作区目录结构 |
| 4 | 打开文件 | 点击文件在 Tab 中打开 |
| 5 | 临时文件标识 | 非工作区文件有特殊标识 |
| 6 | 关闭工作区 | 返回无工作区模式 |
| 7 | 无工作区模式 | 显示"打开工作区"引导 |
| 8 | 状态栏 | 显示正确的工作区/文件信息 |
| 9 | 菜单功能 | 文件菜单包含工作区相关选项 |
| 10 | 文件保存 | 原有保存功能正常工作 |

---

## 依赖关系图

```
Phase 1 (基础设施)
  ├── 1.1 安装 Pinia
  ├── 1.2 创建 workspace Store
  ├── 1.3 创建 files Store  
  └── 1.4 修改 main.js

Phase 2 (UI 组件)
  ├── 2.1 Sidebar 组件
  ├── 2.2 FileTree 组件
  └── 2.3 StatusBar 组件

Phase 3 (后端 API)
  ├── 3.1 Rust 命令
  └── 3.2 前端 API 封装

Phase 4 (菜单改造)
  └── 4.1 MainMenu 修改

Phase 5 (主视图)
  └── 5.1 App.vue 重构

Phase 6 (整合)
  ├── 6.1 Tab 逻辑迁移
  └── 6.2 文件打开整合
```
