// Tauri 2.x Preload - 前端模块

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
  window.electronAPI = {
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
    getAiSettings: () => invoke('get_ai_settings'),
    saveAiSettings: (settings) => invoke('save_ai_settings', {
      baseUrl: settings.baseURL,
      apiKey: settings.apiKey,
      model: settings.model,
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
  };
  
  console.log('API initialized for Tauri');
}

// 立即初始化（如果是 ES 模块导入，会在 DOMContentLoaded 之前执行）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initElectronAPI);
} else {
  initElectronAPI();
}
