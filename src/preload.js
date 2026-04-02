// Tauri Preload - 前端模块

function createBrowserFallbackAPI() {
  const notAvailable = (name) => {
    console.warn(`[lampAPI:fallback] ${name} is unavailable outside Tauri runtime`)
  }

  return {
    minWindow: () => notAvailable('minWindow'),
    maxWindow: () => notAvailable('maxWindow'),
    closeWindow: () => notAvailable('closeWindow'),
    menuViewFullScreen: () => notAvailable('menuViewFullScreen'),
    isMaximized: async () => false,
    menuFileOpen: async () => [-1],
    saveInfo: async () => false,
    saveFileAs: async () => '',
    getFolderContent: async () => [],
    openSpecificFile: async () => [-1],
    hasFile: async () => false,
    delFile: async () => false,
    menuEditUndo: () => notAvailable('menuEditUndo'),
    menuEditRedo: () => notAvailable('menuEditRedo'),
    menuEditCut: () => notAvailable('menuEditCut'),
    menuEditCopy: () => notAvailable('menuEditCopy'),
    menuEditPaste: () => notAvailable('menuEditPaste'),
    menuEditDelete: () => notAvailable('menuEditDelete'),
    menuEditSelectAll: () => notAvailable('menuEditSelectAll'),
    ai: async () => ({ error: 'Tauri runtime unavailable' }),
    getAiSettings: async () => ({ provider: 'deepseek', baseUrl: '', apiKey: '', model: '' }),
    saveAiSettings: async () => false,
    getGeneralSettings: async () => ({
      language: 'zh-CN',
      autoSave: true,
      autoSaveInterval: 30,
      restoreOnStart: true,
      openLastWorkspace: false,
      theme: 'system',
    }),
    saveGeneralSettings: async () => false,
    getEditorSettings: async () => ({ focusMode: false }),
    saveEditorSettings: async () => false,
    openFile: () => { },
    saveFile: () => { },
    newFile: () => { },
    openWorkspace: async () => null,
    isFileInDirectory: async () => false,
    startWatching: async () => false,
    stopWatching: async () => false,
    onFileChange: () => { },
    readTextFile: async () => '',
    getAppDataDir: async () => '',
    getUserPluginsDir: async () => '',
    searchWorkspace: async () => [],
  }
}

// Always expose a safe API synchronously to avoid undefined access during app bootstrap.
if (!window.lampAPI) {
  window.lampAPI = createBrowserFallbackAPI();
}

// 等待 DOM 加载完成后初始化
function initElectronAPI() {
  // 检查是否在 Tauri 环境中
  if (typeof window.__TAURI__ === 'undefined') {
    console.warn('Tauri API not available, running in browser mode');
    return;
  }

  const { invoke } = window.__TAURI__.core;
  const { listen } = window.__TAURI__.event;
  const { open, save } = window.__TAURI__.dialog;

  // 暴露全局 API 到渲染进程
  window.lampAPI = {
    // ==================== 窗口操作 ====================
    // 窗口最小化
    minWindow: () => invoke('minimize_window'),
    // 窗口最大化
    maxWindow: () => invoke('maximize_window'),
    // 关闭窗口
    closeWindow: () => invoke('close_window'),
    // 切换全屏
    menuViewFullScreen: () => invoke('toggle_fullscreen'),
    // 获取窗口最大化状态
    isMaximized: () => invoke('is_maximized'),

    // ==================== 文件操作 ====================
    // 打开文件
    menuFileOpen: async () => {
      const result = await open({
        multiple: false,
        filters: [
          { name: 'All Supported File', extensions: ['lmph', 'html', 'txt', 'md', 'lampsave'] },
          { name: 'Lamp Document', extensions: ['lmph'] },
          { name: 'Web Page', extensions: ['html'] },
          { name: 'Plain Text', extensions: ['txt'] },
          { name: 'Markdown File', extensions: ['md'] },
          { name: 'Lamp Auto Saved File', extensions: ['lampsave'] },
        ],
      });
      
      // 返回值格式兼容
      if (result) {
        // 读取文件内容并返回
        const data = await invoke('open_specific_file', { filePath: result });
        if (data && data[0] === 1) {
          return [0, result, data[1]];
        }
        return [-1];
      }
      return [-1];
    },

    // 保存文件信息
    saveInfo: (filePath, content) => invoke('save_file_content', { filePath, content }),

    // 另存为
    saveFileAs: async (fileName, data) => {
      const path = await save({
        defaultPath: fileName,
        filters: [
          { name: 'All Supported File', extensions: ['lmph', 'html', 'txt'] },
          { name: 'Lamp Document', extensions: ['lmph'] },
          { name: 'Web Page', extensions: ['html'] },
          { name: 'Plain Text', extensions: ['txt'] },
        ],
      });
      
      if (path) {
        await invoke('save_file_content', { filePath: path, content: data });
        return path;
      }
      return '';
    },

    // 获取目录内容
    getFolderContent: (folderPath) => invoke('get_folder_content', { folderPath }),

    // 打开指定文件
    openSpecificFile: (filePath) => invoke('open_specific_file', { filePath }),

    // 检查文件是否存在
    hasFile: (filePath) => invoke('has_file', { filePath }),

    // 删除文件
    delFile: (filePath) => invoke('delete_file', { filePath }),

    // ==================== 编辑操作 ====================
    // 这些需要通过菜单命令实现
    menuEditUndo: () => document.execCommand('undo'),
    menuEditRedo: () => document.execCommand('redo'),
    menuEditCut: () => document.execCommand('cut'),
    menuEditCopy: () => document.execCommand('copy'),
    menuEditPaste: () => document.execCommand('paste'),
    menuEditDelete: () => document.execCommand('delete'),
    menuEditSelectAll: () => document.execCommand('selectAll'),

    // ==================== AI 功能 ====================
    ai: (prompt, message) => invoke('ai_chat', { prompt, message }),
    getAiSettings: async () => {
      const cfg = await invoke('get_ai_settings');
      return {
        provider: cfg.provider,
        baseUrl: cfg.base_url,
        apiKey: cfg.api_key,
        model: cfg.model,
      };
    },
    saveAiSettings: (settings) => invoke('save_ai_settings', {
      provider: settings.provider,
      baseUrl: settings.baseUrl || '',
      apiKey: settings.apiKey || '',
      model: settings.model || '',
    }),

    // ==================== 通用设置 ====================
    getGeneralSettings: () => invoke('get_general_settings'),
    saveGeneralSettings: (settings) => invoke('save_general_settings', {
      language: settings.language,
      autoSave: settings.autoSave,
      autoSaveInterval: settings.autoSaveInterval,
      restoreOnStart: settings.restoreOnStart,
      openLastWorkspace: settings.openLastWorkspace,
      theme: settings.theme,
    }),

    // ==================== 编辑器设置 ====================
    getEditorSettings: () => invoke('get_editor_settings'),
    saveEditorSettings: (settings) => invoke('save_editor_settings', {
      focusMode: settings.focusMode,
    }),

    // ==================== 事件监听 ====================
    // 打开文件事件监听
    openFile: (callback) => {
      listen('open-file', (event) => {
        callback(event.payload.status, event.payload.path, event.payload.data);
      });
    },

    // 保存文件事件监听
    saveFile: (callback) => {
      listen('save-file', () => {
        callback();
      });
    },

    // 新建文件事件监听
    newFile: (callback) => {
      listen('new-file', (event) => {
        callback(event.payload);
      });
    },

    // ==================== 工作区操作 ====================
    // 打开工作区（选择文件夹）
    openWorkspace: async () => {
      const result = await open({
        multiple: false,
        directory: true,  // 选择文件夹
      });

      if (result) {
        // 直接返回文件夹路径作为工作区
        return {
          name: result.split(/[/\\]/).pop(),  // 文件夹名称
          rootPath: result,  // 文件夹路径
        };
      }
      return null;
    },

    // 检查文件是否在工作区内
    isFileInDirectory: async (filePath, dirPath) => {
      return await invoke('is_file_in_directory', { filePath, dirPath });
    },

    // ==================== 文件监视 ====================
    // 开始监视文件夹
    startWatching: (folderPath) => invoke('start_watching', { folderPath }),

    // 停止监视
    stopWatching: () => invoke('stop_watching'),

    // 监听文件变化事件
    onFileChange: (callback) => {
      listen('file-change', (event) => {
        callback(event.payload);
      });
    },

    // ==================== 插件操作 ====================
    // 读取文本文件（供插件加载器使用）
    readTextFile: (filePath) => invoke('read_text_file', { filePath }),

    // 获取应用数据目录
    getAppDataDir: () => invoke('get_app_data_dir'),

    // 获取用户插件目录
    getUserPluginsDir: () => invoke('get_user_plugins_dir'),

    // ==================== 搜索操作 ====================
    searchWorkspace: (workspacePath, query, options) =>
      invoke('search_workspace', {
        workspacePath,
        query,
        options: {
          caseSensitive: !!options?.caseSensitive,
          wholeWord: !!options?.wholeWord,
          maxResults: options?.maxResults || 1000,
        },
      }),
  };
  
  console.log('API initialized for Tauri');
}

// 立即初始化（如果是 ES 模块导入，会在 DOMContentLoaded 之前执行）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initElectronAPI);
} else {
  initElectronAPI();
}
