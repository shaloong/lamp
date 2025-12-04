const { contextBridge, ipcRenderer } = require("electron/renderer");

//                        暴露的API名称↓
contextBridge.exposeInMainWorld("electronAPI", {
  // 主菜单栏行为
  // 通知主进程打开文件
  menuFileOpen: () => ipcRenderer.send("menu-file-open"),
  menuEditUndo: () => ipcRenderer.send("menu-edit-undo"),
  menuEditRedo: () => ipcRenderer.send("menu-edit-redo"),
  menuEditCut: () => ipcRenderer.send("menu-edit-cut"),
  menuEditCopy: () => ipcRenderer.send("menu-edit-copy"),
  menuEditPaste: () => ipcRenderer.send("menu-edit-paste"),
  menuEditSelectAll: () => ipcRenderer.send("menu-edit-select-all"),
  menuEditDelete: () => ipcRenderer.send("menu-edit-delete"),
  menuViewFullScreen: () => ipcRenderer.send("menu-view-full-screen"),
  // 窗口最小化
  minWindow: () => ipcRenderer.send("window-min"),
  // 窗口最大化
  maxWindow: () => ipcRenderer.send("window-max"),
  // 关闭窗口
  closeWindow: () => ipcRenderer.send("window-close"),
  // 打开文件: Electron(status, filePath, content) -> Vue
  openFile: (callback) =>
    ipcRenderer.on("openFile", (_event, status, path, data) =>
      callback(status, path, data)
    ),
  // 保存文件: 通知渲染进程检查能否保存文件: Electron -> Vue(Save Or Not)
  saveFile: (callback) => ipcRenderer.on("saveFile", () => callback()),
  // 保存文件: 渲染进程回传文件信息给主进程进行保存: Vue(filePath) -> Electron 监听 -> handle方法
  saveInfo: (filePath, content) =>
    ipcRenderer.send("save-info", filePath, content),
  // 另存文件: 渲染进程发送给主进程进行保存，并返回成功另存目录: Vue(content) -> Electron(filePath) -> Vue
  saveFileAs: (_event, fileName, data) =>
    ipcRenderer.invoke("saveFileAs", _event, fileName, data),
  // 获取目录信息
  getFolderContent: (_event, folderPath) =>
    ipcRenderer.invoke("getFolderContent", _event, folderPath),
  // 新建文件: Electron(title) -> Vue
  newFile: (callback) =>
    ipcRenderer.on("newFile", (_event, title) => callback(title)),
  // 检测文件是否存在: Vue(filePath, title, content) -> Electron(hasBeenEdited) -> Vue
  hasFile: (_event, filePath) =>
    ipcRenderer.invoke("hasFile", _event, filePath),
  // Vue要求打开文件
  openSpecificFile: (_event, filePath) =>
    ipcRenderer.invoke("openSpecificFile", _event, filePath),
  // 删除文件: Vue -> Electron -> Vue
  delFile: (_event, filePath) =>
    ipcRenderer.invoke("delFile", _event, filePath),
  ai: (_event, prompt, message) =>
    ipcRenderer.invoke("ai", _event, prompt, message),
  getAiSettings: () => ipcRenderer.invoke("get-ai-settings"),
  saveAiSettings: (settings) =>
    ipcRenderer.invoke("save-ai-settings", settings),
});
