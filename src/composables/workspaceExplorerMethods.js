export const workspaceExplorerMethods = {
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
      const result = await window.lampAPI.openWorkspace()
      if (result) {
        this.workspaceStore.setWorkspace({
          workspacePath: '',
          rootPath: result.rootPath,
          name: result.name,
          settings: {}
        })

        if (result.rootPath) {
          this.showDirection(result.rootPath)
          await window.lampAPI.startWatching(result.rootPath)
        }

        this.tempFiles = []
      }
    } catch (error) {
      console.error('打开工作区失败:', error)
    }
  },

  // 关闭工作区
  async closeWorkspace() {
    await window.lampAPI.stopWatching()
    this.workspaceStore.clearWorkspace()
    this.fileStore.clearAll()
    this.folderContent = ''
    this.tempFiles = []
  },

  // 初始化文件变化监听
  initFileWatcher() {
    window.lampAPI.onFileChange((event) => {
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
    if (!this.tabs || this.tabs.length === 0 || !this.tabs[this.activeTab]) {
      this.folderContent = ""
      return
    }

    if (path === undefined) {
      path = this.getParentDirectory(this.tabs[this.activeTab].filePath)
    }

    let expandedRelativePaths = []
    if (mode === 'refresh' && this.folderContent && this.workspaceStore.rootPath) {
      expandedRelativePaths = this.collectExpandedRelativePaths(this.folderContent, this.workspaceStore.rootPath)
    }

    if (path !== "") {
      window.lampAPI.getFolderContent(path).then(result => {
        this.folderContent = this.convertToTree(result)

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
