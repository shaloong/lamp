import { getLampAPI } from '@/lib/lampApi'

export const workspaceExplorerMethods = {
  getLampAPI() {
    return getLampAPI()
  },

  // 获取父目录
  getParentDirectory(url) {
    if (url === "") {
      return url
    }

    const path = new URL(url).pathname
    const parts = path.split('/')
    parts.shift()
    parts.pop()
    if (parts.length === 0) {
      return '/'
    }
    return parts.join('/') + '/'
  },

  // 打开工作区（选择文件夹）
  async openWorkspace() {
    try {
      const api = this.getLampAPI?.()
      if (!api) return

      const result = await api.openWorkspace()
      if (result) {
        this.workspaceStore.setWorkspace({
          workspacePath: '',
          rootPath: result.rootPath,
          name: result.name,
          settings: {}
        })

        if (result.rootPath) {
          this.showDirection(result.rootPath)
          await api.startWatching(result.rootPath)
        }

        this.tempFiles = []
      }
    } catch (error) {
      console.error('打开工作区失败:', error)
    }
  },

  // 关闭工作区
  async closeWorkspace() {
    const api = this.getLampAPI?.()
    if (api) {
      await api.stopWatching()
    }
    this.workspaceStore.clearWorkspace()
    this.fileStore.clearAll()
    this.folderContent = ''
    this.tempFiles = []
  },

  // 初始化文件变化监听
  initFileWatcher() {
    const api = this.getLampAPI?.()
    if (!api) return

    api.onFileChange((event) => {
      console.log('文件变化:', event)
      if (this.workspaceStore.isOpen && this.workspaceStore.rootPath) {
        this.showDirection(this.workspaceStore.rootPath, 'refresh')
      }
    })
  },

  // 打开临时文件
  async openTempFile(file) {
    await this.openSpecificFile(file.path)
  },

  // 转换为树结构
  convertToTree(folderContent) {
    const tree = []
    for (const item of folderContent) {
      const node = {
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
        isSupported: item.isSupported,
      }
      if (item.children && item.children.length > 0) {
        node.children = this.convertToTree(item.children)
      }
      tree.push(node)
    }
    return tree
  },

  // 展示目录结构
  // mode: 'normal' | 'refresh'  - refresh 模式会保留展开状态
  showDirection(path, mode = 'normal') {
    // 允许无标签页时也展示文件树（工作区打开时可能还没有标签页）
    if (path === undefined) {
      if (!this.tabs || this.tabs.length === 0 || !this.tabs[this.activeTab]) {
        return
      }
      path = this.getParentDirectory(this.tabs[this.activeTab].filePath)
    }

    let expandedRelativePaths = []
    if (mode === 'refresh' && this.folderContent && this.workspaceStore.rootPath) {
      expandedRelativePaths = this.collectExpandedRelativePaths(this.folderContent, this.workspaceStore.rootPath)
    }

    if (path !== "") {
      const api = this.getLampAPI?.()
      if (!api) {
        this.folderContent = ""
        return
      }

      api.getFolderContent(path).then(result => {
        this.folderContent = this.convertToTree(result)

        // normal 模式下自动展开根目录
        if (mode === 'normal' && this.workspaceStore.rootPath) {
          this.expandedKeys = [this.workspaceStore.rootPath]
          this.fileStore.expandedFolders = new Set(this.expandedKeys)
        }

        if (mode === 'refresh' && expandedRelativePaths.length > 0) {
          this.$nextTick(() => {
            this.restoreExpandedByRelativePaths(this.folderContent, expandedRelativePaths, this.workspaceStore.rootPath)
          })
        }
      }).catch(error => {
        console.error(error)
        this.folderContent = ""
      })
    } else {
      this.folderContent = ""
    }
  },

  // 收集展开的文件夹相对路径
  collectExpandedRelativePaths(tree, rootPath) {
    const paths = []
    const collect = (nodes) => {
      for (const node of nodes) {
        if (node.isDirectory && this.fileStore.isExpanded(node.path)) {
          const relativePath = this.getRelativePath(node.path, rootPath)
          paths.push(relativePath)
        }
        if (node.children) {
          collect(node.children)
        }
      }
    }
    collect(tree || [])
    return paths
  },

  // 获取相对路径
  getRelativePath(fullPath, rootPath) {
    const normalizedFull = fullPath.replace(/\\/g, '/')
    const normalizedRoot = rootPath.replace(/\\/g, '/')
    if (normalizedFull.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
      return normalizedFull.substring(normalizedRoot.length).replace(/^\//, '')
    }
    return normalizedFull
  },

  // 根据相对路径恢复展开状态
  restoreExpandedByRelativePaths(tree, relativePaths, rootPath) {
    if (!tree || !relativePaths) return

    const newExpandedKeys = []
    const restore = (nodes) => {
      for (const node of nodes) {
        const relativePath = this.getRelativePath(node.path, rootPath)
        if (relativePaths.includes(relativePath)) {
          newExpandedKeys.push(node.path)
        }
        if (node.children) {
          restore(node.children)
        }
      }
    }
    restore(tree)

    this.expandedKeys = newExpandedKeys
    this.fileStore.expandedFolders = new Set(newExpandedKeys)
  },

  handleNodeClick(data) {
    const filePath = data.path

    // 目录：切换展开状态
    if (data.isDirectory) {
      this.handleToggleExpand(filePath)
      return
    }

    // 不支持的文件格式：静默忽略（已由 UI 区分颜色，用户可感知不可点击）
    if (!data.isSupported) {
      console.warn(`[Lamp] Unsupported file format: ${filePath}`)
      return
    }

    // 正常文件：加入临时文件区并打开
    if (this.workspaceStore.isOpen) {
      const isInWorkspace = this.fileStore.isFileInWorkspace(filePath, this.workspaceStore.rootPath)
      if (!isInWorkspace) {
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop()
        const exists = this.tempFiles.some(f => f.path === filePath)
        if (!exists) {
          this.tempFiles.push({ name: fileName, path: filePath })
        }
      }
    }
    this.openSpecificFile(filePath)
  },

  handleToggleExpand(filePath) {
    if (this.expandedKeys.includes(filePath)) {
      this.expandedKeys = this.expandedKeys.filter(k => k !== filePath)
    } else {
      this.expandedKeys = [...this.expandedKeys, filePath]
    }
    this.fileStore.expandedFolders = new Set(this.expandedKeys)
  },
}
