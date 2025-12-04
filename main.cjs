const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const getWindow = require("./window.cjs");
const { createConfigFile, ensureConfigShape } = require("./init.cjs");
const fs = require("fs-extra");
const path = require("path");
const { setLanguage, locale } = require("./locale.cjs");
const OpenAI = require("openai");

// 检查和初始化配置文件
const configPath = createConfigFile();

// 读取配置文件
let parsedConfig = {};
try {
  const configData = fs.readFileSync(configPath, "utf-8");
  parsedConfig = JSON.parse(configData);
} catch (error) {
  console.error("Error reading config.json:", error);
}

global.config = ensureConfigShape(parsedConfig);

function persistConfig() {
  fs.writeFileSync(configPath, JSON.stringify(global.config, null, 2), "utf-8");
}

function createOpenAIClient() {
  const { openAI } = global.config;
  return new OpenAI({
    baseURL: openAI?.baseURL || "https://api.deepseek.com",
    apiKey: openAI?.apiKey || "",
  });
}

// 创建主进程多语言支持
setLanguage(global.config.language);

app.whenReady().then(() => {
  let win = null;
  win = new getWindow().createWindow(); // 创建窗口

  let openai = createOpenAIClient();

  ipcMain.handle("ai", async (_event, prompt, message) => {
    if (!global.config.openAI?.apiKey) {
      throw new Error("OpenAI API key is not configured.");
    }
    const model = global.config.openAI?.model || "deepseek-chat";
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      model,
    });
    return completion.choices[0].message.content;
  });

  ipcMain.handle("get-ai-settings", async () => ({
    baseURL: global.config.openAI?.baseURL || "",
    apiKey: global.config.openAI?.apiKey || "",
    model: global.config.openAI?.model || "deepseek-chat",
  }));

  ipcMain.handle("save-ai-settings", async (_event, payload) => {
    global.config.openAI = {
      ...global.config.openAI,
      baseURL: payload.baseURL?.trim() || "",
      apiKey: payload.apiKey?.trim() || "",
      model: payload.model?.trim() || "deepseek-chat",
    };
    persistConfig();
    openai = createOpenAIClient();
    return true;
  });

  ipcMain.handle("saveFileAs", handleSaveFileAs);
  ipcMain.handle("getFolderContent", handleGetFolderContent);
  ipcMain.handle("openSpecificFile", handleOpenSpecificFile);
  ipcMain.handle("hasFile", handleHasFile);
  ipcMain.handle("delFile", handleDelFile);

  ipcMain.on("save-info", (_event, filePath, content) => {
    fs.writeFile(filePath, content, "utf8", (err) => {
      if (err) {
        console.log("Error when saving.");
      } else {
        // 写入成功，返回保存路径
        // console.log("Success.")
      }
    });
  });

  // 窗口最小化
  ipcMain.on("window-min", (_event) => {
    win.minimize();
  });
  // 窗口最大化
  ipcMain.on("window-max", function () {
    if (win.isMaximized()) {
      win.restore();
    } else {
      win.maximize();
    }
  });
  // 窗口关闭
  ipcMain.on("window-close", function () {
    win.close();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) win.createWindow();
    });
  });

  // Vue菜单的打开文件：接收信号 -> 弹出窗口 -> 发送给Vue
  ipcMain.on("menu-file-open", function () {
    dialog
      .showOpenDialog({
        // 通过 dialog 模块显示 “打开文件” 对话框
        properties: ["openFile"], // 参数选择打开文件
        filters: [
          {
            name: locale("all-supported-file"),
            extensions: ["lmph", "html", "txt", "md", "lampsave"],
          },
          { name: locale("lamp-document"), extensions: ["lmph"] },
          { name: locale("web-page"), extensions: ["html"] },
          { name: locale("plain-text"), extensions: ["txt"] },
          { name: locale("markdown-file"), extensions: ["md"] },
          { name: locale("lamp-auto-saved-file"), extensions: ["lampsave"] },
        ], // 文件类型过滤器
      })
      .then((res) => {
        if (res && res.filePaths && res.filePaths.length > 0) {
          // 如果选择了文件
          fs.readFile(res.filePaths[0], "utf8", (err, data) => {
            // 通过 fs-extra 读取文件内容
            if (err) {
              // 读取失败
              win.send("openFile", -1);
            } else {
              // 读取成功，将内容发送给 vue 项目
              win.send("openFile", 0, res.filePaths[0], data);
            }
          });
        }
      });
  });
  // Vue菜单的编辑
  ipcMain.on("menu-edit-undo", function () {
    win.webContents.undo();
  });
  ipcMain.on("menu-edit-redo", function () {
    win.webContents.redo();
  });
  ipcMain.on("menu-edit-cut", function () {
    win.webContents.cut();
  });
  ipcMain.on("menu-edit-copy", function () {
    win.webContents.copy();
  });
  ipcMain.on("menu-edit-paste", function () {
    win.webContents.paste();
  });
  ipcMain.on("menu-edit-delete", function () {
    win.webContents.delete();
  });
  ipcMain.on("menu-edit-select-all", function () {
    win.webContents.selectAll();
  });
  ipcMain.on("menu-view-full-screen", function () {
    win.setSimpleFullScreen(!win.isFullScreen());
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
});

// 处理另存为，接收内容 -> 用户选择并保存 -> 返回路径给Vue
async function handleSaveFileAs(_event, fileName, data) {
  return new Promise((resolve, reject) => {
    dialog
      .showSaveDialog({
        // 通过 dialog 模块打开 保存文件 对话框
        title: "文件另存为",
        defaultPath: path.join(__dirname, fileName), // 默认文件保存路径
        filters: [
          {
            name: locale("all-supported-file"),
            extensions: ["lmph", "html", "txt"],
          },
          { name: locale("lamp-document"), extensions: ["lmph"] },
          { name: locale("web-page"), extensions: ["html"] },
          { name: locale("plain-text"), extensions: ["txt"] },
        ], // 文件类型过滤器，只保留为 markdown 文件
      })
      .then((res) => {
        if (res && res.filePath) {
          fs.writeFile(res.filePath, data, "utf8", (err) => {
            if (err) {
              reject(err);
            } else {
              // 写入成功，返回保存路径
              resolve(res.filePath);
            }
          });
        } else {
          resolve("");
        }
      })
      .catch((error) => {
        reject(error); // 处理可能出现的其他错误
      });
  });
}

// 处理获取目录结构
function handleGetFolderContent(_event, folderPath) {
  return new Promise((resolve, reject) => {
    // 递归遍历文件夹并获取完整内容
    function traverseFolder(folderPath) {
      return new Promise((resolve, reject) => {
        fs.readdir(folderPath, { withFileTypes: true }, async (err, files) => {
          if (err) {
            reject(err);
            return;
          }
          const result = [];
          for (const file of files) {
            const filePath = path.join(folderPath, file.name);
            const fileInfo = {
              name: file.name,
              path: filePath,
              isDirectory: file.isDirectory(),
            };
            if (fileInfo.isDirectory) {
              // 如果是文件夹，则递归遍历子文件夹
              fileInfo.children = await traverseFolder(filePath);
            }
            result.push(fileInfo);
          }
          resolve(result);
        });
      });
    }

    // 开始递归遍历文件夹
    traverseFolder(folderPath)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        console.error("Error reading directory: ", error);
        reject(error);
      });
  });
}

// 处理来自 Vue 的打开文件
async function handleOpenSpecificFile(_event, filePath) {
  try {
    // 检查给定路径是否为文件
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      // 如果路径是一个目录，则直接返回空结果
      return [0];
    }

    // 读取文件内容
    const data = await fs.readFile(filePath, "utf8");
    return [1, data];
  } catch (error) {
    // 处理错误
    console.error("An error occurred while opening the file:", error);
    throw error; // 将错误传播给调用方
  }
}

async function handleHasFile(_event, filePath) {
  return Promise.resolve(fs.existsSync(filePath));
}

async function handleDelFile(_event, filePath) {
  try {
    await fs.unlink(filePath);
    return true; // 返回 true 表示删除成功
  } catch (error) {
    return false; // 返回 false 表示删除失败
  }
}
