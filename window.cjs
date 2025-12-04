const { app, Menu, BrowserWindow, dialog } = require('electron')
const path = require('node:path')
const windowStateKeeper = require('electron-window-state');
const {locale} = require("./locale.cjs");
const fs = require("fs-extra")

const isMac = process.platform === 'darwin'

/* 创建窗口对象 */
class Window {
    win = null

    createWindow() {
        this.win = this.getWindowState()

        // 等待DOM渲染后打开窗口
        this.win.on('ready-to-show', () => {
            this.win.show()
        })
        this.win.on('closed', () => {
            this.win = null;
        })

        let contents = this.win.webContents

        // 主菜单栏
        const templateMenu = [
            // { role: 'appMenu' }
            ...(isMac
                ? [{
                    label: app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' }
                    ]
                }]
                : []),
            // 文件
            {
                label: locale('file'),
                submenu: [
                    // 文件->打开
                    { label: locale('open'),
                        accelerator: 'CmdOrCtrl+O',
                        click:() => {
                            dialog.showOpenDialog({ // 通过 dialog 模块显示 “打开文件” 对话框
                                properties: ['openFile'], // 参数选择打开文件
                                filters: [
                                    { name: locale('all-supported-file'), extensions: ['lmph', 'html', 'txt', 'md', 'lampsave'] },
                                    { name: locale('lamp-document'), extensions: ['lmph'] },
                                    { name: locale('web-page'), extensions: ['html'] },
                                    { name: locale('plain-text'), extensions: ['txt'] },
                                    { name: locale('markdown-file'), extensions: ['md'] },
                                    { name: locale('lamp-auto-saved-file'), extensions: ['lampsave'] },
                                ], // 文件类型过滤器
                            }).then((res) => {
                                if (res && res.filePaths && res.filePaths.length > 0) { // 如果选择了文件
                                    fs.readFile(res.filePaths[0], "utf8", (err, data) => { // 通过 fs-extra 读取文件内容
                                        if (err) { // 读取失败
                                            contents.send('openFile', -1)
                                        } else { // 读取成功，将内容发送给 vue 项目
                                            contents.send('openFile', 0, res.filePaths[0], data)
                                        }
                                    })
                                }
                            })
                        }
                    },
                    // 文件 -> 保存
                    {
                        label: locale('save'),
                        accelerator: 'CmdOrCtrl+S' ,
                        click:() => {
                            contents.send('saveFile')
                        }

                    },
                    // 文件 -> 另存为
                    {
                        label: locale('save-as'),
                        accelerator: 'CmdOrCtrl+Shift+S' ,
                        click:() => {
                        }
                    },
                    // 文件 -> 关闭（Mac） / 退出（非Mac）
                    isMac ? { role: 'close', label: locale('close') } : { role: 'quit', label: locale('quit') }
                ]
            },
            // 编辑
            {
                label: locale('edit'),
                submenu: [
                    // 编辑 -> 撤销
                    { role: 'undo', label: locale('undo') },
                    // 编辑 -> 重做
                    { role: 'redo', label: locale('redo') },
                    // ----------------------------
                    { type: 'separator' },
                    // 编辑 -> 剪切
                    { role: 'cut', label: locale('cut') },
                    // 编辑 -> 复制
                    { role: 'copy', label: locale('copy') },
                    // 编辑 -> 粘贴
                    { role: 'paste', label: locale('paste') },
                    ...(isMac
                        ? [
                            { role: 'pasteAndMatchStyle' },
                            { role: 'delete', label: locale('delete') },
                            { role: 'selectAll', label: locale('select-all') },
                            { type: 'separator' },
                            {
                                label: 'Speech',
                                submenu: [
                                    { role: 'startSpeaking' },
                                    { role: 'stopSpeaking' }
                                ]
                            }
                        ]
                        : [
                            // 编辑 -> 删除
                            { role: 'delete', label: locale('delete') },
                            // ----------------------------
                            { type: 'separator' },
                            // 编辑 -> 全选
                            { role: 'selectAll', label: locale('select-all') }
                        ])
                ]
            },
            // 视图
            {
                label: locale('view'),
                submenu: [
                    // 开发用选项，生产环境不使用
                    // // 视图 -> 重载
                    // { role: 'reload', label: locale('reload') },
                    // // 视图 -> 强制重载
                    // { role: 'forceReload', label: locale('force-reload') },
                    // // 视图 -> 开发工具
                    // { role: 'toggleDevTools', label: locale('toggle-develop-tools') },
                    // //
                    // { type: 'separator' },
                    // // 视图 -> 重置缩放
                    // { role: 'resetZoom', label: locale('actual-size') },
                    // // 视图 -> 放大
                    { role: 'zoomIn', label: locale('zoom-in') },
                    // 视图 -> 缩小
                    { role: 'zoomOut', label: locale('zoom-out') },
                    // ----------------------------
                    { type: 'separator' },
                    // 视图 -> 全屏
                    { role: 'togglefullscreen', label: locale('toggle-full-screen') }
                ]
            },
            // 窗口
            {
                label: locale('window'),
                submenu: [
                    // 窗口 -> 最小化
                    { role: 'minimize', label: locale('minimize') },
                    // 窗口 -> 缩放
                    { role: 'zoom', label: locale('zoom') },
                    ...(isMac
                        ? [
                            { type: 'separator' },
                            { role: 'front' },
                            { type: 'separator' },
                            { role: 'window' }
                        ]
                        : [
                            // // 窗口 -> 关闭 与文件选项卡重复，易造成用户困惑，不采用
                            // { role: 'close', label: locale('close') }
                        ])
                ]
            },
            // 帮助
            {
                role: 'help',
                label: locale('help'),
                submenu: [
                    {
                        // 帮助 -> 了解更多
                        label: locale('learn-more'),
                        click: async () => {
                            const { shell } = require('electron')
                            await shell.openExternal('https://www.shaloong.com')
                        }
                    }
                ]
            }
        ]

        contents.openDevTools()

        const menu = Menu.buildFromTemplate(templateMenu)
        Menu.setApplicationMenu(menu)

        this.win.setMinimumSize(375, 200);

        this.win.loadURL('http://localhost:1086/')
        // this.win.loadFile('/dist/index.html')

        return this.win
    }

    getWindowState() {
        let win
        const mainWindowState = windowStateKeeper({
            defaultWidth: 1000,
            defaultHeight: 800
        });
        const options = {
            ...mainWindowState,
            devTools: true,
            show: false,
            frame: false, // 关闭默认边框
            webPreferences: {
                sandbox: false, // 关闭沙盒
                // nodeIntegration:true,  // 集成node api
                // contextIsolation:false  // 关闭上下文隔离，配合nodeIntegration，可以赋予在render进程中写node代码的能力
                preload: path.resolve(__dirname, 'preload.cjs'),  //预加载的js文件
            }
        }

        win = new BrowserWindow(options)
        mainWindowState.manage(win);
        return win
    }

}

module.exports = Window