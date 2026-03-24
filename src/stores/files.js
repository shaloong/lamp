/**
 * 文件状态管理 Store
 * 管理文件树、工作区文件和临时文件的状态
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFileStore = defineStore('files', () => {
  // 状态
  const tree = ref([]);
  const workspaceFiles = ref([]);
  const tempFiles = ref([]);
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

  function removeFile(filePath) {
    const tempIndex = tempFiles.value.findIndex(f => f.path === filePath);
    if (tempIndex !== -1) {
      tempFiles.value.splice(tempIndex, 1);
      return;
    }
    const wsIndex = workspaceFiles.value.findIndex(f => f.path === filePath);
    if (wsIndex !== -1) {
      workspaceFiles.value.splice(wsIndex, 1);
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

  function expandFolder(path) {
    expandedFolders.value.add(path);
  }

  function collapseFolder(path) {
    expandedFolders.value.delete(path);
  }

  function clearAll() {
    tree.value = [];
    workspaceFiles.value = [];
    tempFiles.value = [];
    expandedFolders.value.clear();
  }

  /**
   * 检查文件是否在工作区目录内
   */
  function isFileInWorkspace(filePath, rootPath) {
    if (!rootPath || !filePath) return false;
    const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();
    const normalizedRootPath = rootPath.replace(/\\/g, '/').toLowerCase();
    return normalizedFilePath.startsWith(normalizedRootPath);
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
    removeFile,
    toggleFolder,
    isExpanded,
    expandFolder,
    collapseFolder,
    clearAll,
    isFileInWorkspace,
  };
});
