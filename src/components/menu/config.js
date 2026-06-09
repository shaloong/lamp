export const menuSections = [
  {
    id: 'file',
    titleKey: 'menu.file',
    items: [
      { type: 'command', id: 'app.newFile', labelKey: 'commands.app.newFile' },
      { type: 'command', id: 'app.openFile', labelKey: 'menu.openFile' },
      { type: 'command', id: 'app.openWorkspace', labelKey: 'commands.app.openWorkspace' },
      { type: 'plugin', area: 'file' },
      { type: 'separator' },
      { type: 'command', id: 'app.save', labelKey: 'menu.save' },
      { type: 'command', id: 'app.saveAs', labelKey: 'menu.saveAs' },
      { type: 'separator' },
      { type: 'command', id: 'app.close', labelKey: 'menu.close' },
    ],
  },
  {
    id: 'edit',
    titleKey: 'menu.edit',
    items: [
      { type: 'command', id: 'app.undo', labelKey: 'menu.undo' },
      { type: 'command', id: 'app.redo', labelKey: 'menu.redo' },
      { type: 'separator' },
      { type: 'command', id: 'app.cut', labelKey: 'menu.cut' },
      { type: 'command', id: 'app.copy', labelKey: 'menu.copy' },
      { type: 'command', id: 'app.paste', labelKey: 'menu.paste' },
      { type: 'command', id: 'app.selectAll', labelKey: 'menu.selectAll' },
      { type: 'command', id: 'app.delete', labelKey: 'menu.delete' },
      { type: 'separator' },
      { type: 'command', id: 'app.find', labelKey: 'commands.app.find' },
      { type: 'command', id: 'app.replace', labelKey: 'commands.app.replace' },
      { type: 'plugin', area: 'edit' },
    ],
  },
  {
    id: 'view',
    titleKey: 'menu.view',
    items: [
      { type: 'command', id: 'app.fullScreen', labelKey: 'menu.fullScreen' },
      { type: 'plugin', area: 'view' },
    ],
  },
]
