import { getLampAPI } from '@/lib/lampApi'

export const workspaceExplorerMethods = {
  getLampAPI() {
    return getLampAPI()
  },

  // 获取父目录
  getParentDirectory(filePath) {
    if (!filePath) {
      return filePath
    }

    // 统一为 /，避免 Windows 路径在 URL 解析下被当成相对路径导致目录错误
    const normalized = String(filePath).replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    parts.pop()

    if (parts.length === 0) {
      return '/'
    }

    // 保持与后端一致，传递绝对目录路径（不带尾部斜杠）
    return parts.join('/')
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

    let refreshTimer = null
    const debouncedRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        if (this.workspaceStore.isOpen && this.workspaceStore.rootPath) {
          this.showDirection(this.workspaceStore.rootPath, 'refresh')
        }
      }, 150)
    }

    api.onFileChange((event) => {
      // 跳过 .lampsave 自动保存文件，不触发树刷新
      if (event.path && event.path.endsWith('.lampsave')) {
        return
      }
      console.log('[Lamp] File change:', event.type, event.path)
      debouncedRefresh()
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
  // mode: 'normal' | 'refresh' — refresh 保留展开状态
  showDirection(_path, mode = 'normal') {
    // 资源树根始终固定为当前工作区根目录
    const path = this.workspaceStore?.rootPath
    if (!path) {
      return
    }

    let expandedRelativePaths = []
    if (mode === 'refresh' && this.folderContent && this.workspaceStore.rootPath) {
      expandedRelativePaths = this.collectExpandedRelativePaths(this.folderContent, this.workspaceStore.rootPath)
    }

    if (path !== "") {
      const api = this.getLampAPI?.()
      if (!api) {
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
        // 仅在路径确实无效时清空；其他错误保留旧树
        const msg = typeof error === 'string' ? error : error?.message || ''
        if (msg.includes('does not exist') || msg.includes('Path does not exist')) {
          this.folderContent = ''
        } else {
          console.warn('[Lamp] showDirection failed, keeping existing tree:', error)
        }
      })
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
