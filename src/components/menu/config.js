export const menuSections = [
  {
    id: 'file',
    titleKey: 'menu.file',
    items: [
      { type: 'command', id: 'app.newFile', labelKey: 'menu.newFile' },
      { type: 'command', id: 'app.openFile', labelKey: 'menu.openFile', accelerator: 'Ctrl+O' },
      { type: 'plugin', area: 'file' },
      { type: 'separator' },
      { type: 'command', id: 'app.save', labelKey: 'menu.save', accelerator: 'Ctrl+S' },
      { type: 'command', id: 'app.saveAs', labelKey: 'menu.saveAs' },
      { type: 'separator' },
      { type: 'command', id: 'app.close', labelKey: 'menu.close' },
    ],
  },
  {
    id: 'edit',
    titleKey: 'menu.edit',
    items: [
      { type: 'command', id: 'app.undo', labelKey: 'menu.undo', accelerator: 'Ctrl+Z' },
      { type: 'command', id: 'app.redo', labelKey: 'menu.redo', accelerator: 'Ctrl+Y' },
      { type: 'separator' },
      { type: 'command', id: 'app.cut', labelKey: 'menu.cut', accelerator: 'Ctrl+X' },
      { type: 'command', id: 'app.copy', labelKey: 'menu.copy', accelerator: 'Ctrl+C' },
      { type: 'command', id: 'app.paste', labelKey: 'menu.paste', accelerator: 'Ctrl+V' },
      { type: 'command', id: 'app.selectAll', labelKey: 'menu.selectAll', accelerator: 'Ctrl+A' },
      { type: 'command', id: 'app.delete', labelKey: 'menu.delete', accelerator: 'Del' },
      { type: 'plugin', area: 'edit' },
    ],
  },
  {
    id: 'view',
    titleKey: 'menu.view',
    items: [
      { type: 'command', id: 'app.fullScreen', labelKey: 'menu.fullScreen', accelerator: 'F11' },
      { type: 'plugin', area: 'view' },
    ],
  },
]
