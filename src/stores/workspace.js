/**
 * 工作区状态管理 Store
 * 管理工作区的开关、配置信息以及最近工作区列表
 */
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
    workspacePath.value = config.workspacePath || '';
    rootPath.value = config.rootPath || '';
    name.value = config.name || '';
    settings.value = config.settings || {};

    // 添加到最近工作区
    if (rootPath.value) {
      addToRecent({
        name: name.value,
        path: rootPath.value
      });
    }
  }

  function clearWorkspace() {
    isOpen.value = false;
    workspacePath.value = '';
    rootPath.value = '';
    name.value = '';
    settings.value = {};
  }

  function addToRecent(workspace) {
    // 移除已存在的相同路径
    const filtered = recentWorkspaces.value.filter(w => w.path !== workspace.path);
    // 添加到开头
    recentWorkspaces.value = [workspace, ...filtered].slice(0, 10);
  }

  function removeFromRecent(index) {
    recentWorkspaces.value.splice(index, 1);
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
    addToRecent,
    removeFromRecent,
  };
});
