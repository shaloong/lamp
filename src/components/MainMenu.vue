<script setup>
import '@/assets/iconfont.js'
import { useWorkspaceStore } from '@/stores/workspace'
import { pluginHost } from '../plugins/index'

const workspaceStore = useWorkspaceStore()

// 触发菜单项动作：查找插件上下文并调用
function invokeAction(pluginId, action) {
  const ctx = pluginHost.getContext(pluginId)
  if (!ctx) { console.warn(`[MainMenu] Plugin context "${pluginId}" not found.`); return }
  try {
    const result = action(ctx)
    if (result instanceof Promise) {
      result.catch(err => console.error(`[MainMenu] Action failed (${pluginId}):`, err))
    }
  } catch (err) {
    console.error(`[MainMenu] Action error (${pluginId}):`, err)
  }
}
</script>

<template>
  <div class="main-menu-bar">
    <el-menu class="main-menu" popper-class="popper" mode="horizontal" background-color="#F2F2F2" :unique-opened="true"
      :collapse-transition="false" :show-timeout="50" :hide-timeout="50" menu-trigger="hover">
      <img style="margin: 0 10px 0 15px; width: 18px;" src="/src/assets/lamp-icon.svg" alt="Lamp Logo" />

      <!-- 文件菜单 -->
      <el-sub-menu index="file">
        <template #title>文件</template>
        <el-menu-item index="file-new" @click="$emit('newFile')">新建</el-menu-item>
        <el-menu-item index="file-open" @click="$emit('openFile')">
          <div class="menu-item__title">打开文件</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+O</div>
        </el-menu-item>
        <!-- 来自插件的文件菜单项 -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('file')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ item.label }}</div>
            <div class="flex-grow" v-if="item.accelerator" />
            <div class="menu-item__shortcut" v-if="item.accelerator">{{ item.accelerator }}</div>
          </el-menu-item>
        </template>
        <el-divider />
        <el-menu-item index="file-save" @click="$emit('saveFile')">
          <div class="menu-item__title">保存</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+S</div>
        </el-menu-item>
        <el-menu-item index="file-save-as" @click="$emit('saveFileAs')">另存为</el-menu-item>
        <el-menu-item index="file-close" @click="$emit('closeWindow')">关闭</el-menu-item>
      </el-sub-menu>

      <!-- 编辑菜单 -->
      <el-sub-menu index="edit">
        <template #title>编辑</template>
        <el-menu-item index="edit-undo" @click="$emit('editUndo')">
          <div class="menu-item__title">撤销</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+Z</div>
        </el-menu-item>
        <el-menu-item index="edit-redo" @click="$emit('editRedo')">
          <div class="menu-item__title">重做</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+Y</div>
        </el-menu-item>
        <el-divider />
        <el-menu-item index="edit-cut" @click="$emit('editCut')">
          <div class="menu-item__title">剪切</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+X</div>
        </el-menu-item>
        <el-menu-item index="edit-copy" @click="$emit('editCopy')">
          <div class="menu-item__title">复制</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+C</div>
        </el-menu-item>
        <el-menu-item index="edit-paste" @click="$emit('editPaste')">
          <div class="menu-item__title">粘贴</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+V</div>
        </el-menu-item>
        <el-menu-item index="edit-select-all" @click="$emit('editSelectAll')">
          <div class="menu-item__title">全选</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+A</div>
        </el-menu-item>
        <el-menu-item index="edit-delete" @click="$emit('editDelete')">
          <div class="menu-item__title">删除</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Del</div>
        </el-menu-item>
        <!-- 来自插件的编辑菜单项（如 AI 操作） -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('edit')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ item.label }}</div>
            <div class="flex-grow" v-if="item.accelerator" />
            <div class="menu-item__shortcut" v-if="item.accelerator">{{ item.accelerator }}</div>
          </el-menu-item>
        </template>
      </el-sub-menu>

      <!-- 视图菜单 -->
      <el-sub-menu index="view">
        <template #title>视图</template>
        <el-menu-item index="view-fullscreen" @click="$emit('viewFullScreen')">
          <div class="menu-item__title">全屏</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">F11</div>
        </el-menu-item>
        <!-- 来自插件的视图菜单项 -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('view')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ item.label }}</div>
            <div class="flex-grow" v-if="item.accelerator" />
            <div class="menu-item__shortcut" v-if="item.accelerator">{{ item.accelerator }}</div>
          </el-menu-item>
        </template>
      </el-sub-menu>

      <!-- 设置菜单 -->
      <el-sub-menu index="settings">
        <template #title>设置</template>
        <el-menu-item index="settings-ai" @click="$emit('openSettings')">
          <div class="menu-item__title">AI 接口</div>
        </el-menu-item>
        <!-- 来自插件的设置菜单项 -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('settings')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ item.label }}</div>
          </el-menu-item>
        </template>
        <el-divider />
        <el-menu-item index="settings-plugins" @click="$emit('openPlugins')">
          <div class="menu-item__title">插件管理</div>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>

    <!-- 窗口控制按钮：位于右上角，与菜单项同一行 -->
    <div class="window-controls">
      <button class="win-btn" @click.stop="$emit('minWindow')" title="最小化">
        <svg class="win-icon" aria-hidden="true">
          <use xlink:href="#icon-minimize"></use>
        </svg>
      </button>
      <button class="win-btn" @click.stop="$emit('maxWindow')" title="最大化">
        <svg class="win-icon" aria-hidden="true">
          <use xlink:href="#icon-maximize1"></use>
        </svg>
      </button>
      <button class="win-btn win-btn--close" @click.stop="$emit('closeWindow')" title="关闭">
        <svg class="win-icon" aria-hidden="true">
          <use xlink:href="#icon-close"></use>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  emits: [
    'newFile', 'openFile', 'saveFile', 'saveFileAs', 'closeWindow',
    'editUndo', 'editRedo', 'editCut', 'editCopy', 'editPaste',
    'editSelectAll', 'editDelete',
    'viewFullScreen',
    'openSettings', 'openPlugins',
    'minWindow', 'maxWindow',
  ],
  data() {
    return { pluginHost };
  },
}
</script>

<style lang="scss">
@use "@/styles/element/index" as *;
@use "@/styles/style" as *;

.flex-grow {
  flex-grow: 1;
}

.main-menu-bar {
  position: absolute;
  top: 0;
  width: 100%;
  height: 38px;
  display: flex;
  align-items: stretch;
  -webkit-app-region: drag;
  user-select: none;
}

.main-menu {
  flex: 1;
  height: 38px !important;
  border: 0 !important;
  border-bottom: 1px solid rgba($lamp-color-neutral-grey, 0.2) !important;
}

.el-menu--horizontal>.el-menu-item,
.el-menu--horizontal>.el-sub-menu>.el-sub-menu__title {
  height: 38px !important;
  line-height: 38px !important;
}

.el-sub-menu__title {
  color: $lamp-color-neutral-dark !important;
  border-bottom-color: transparent !important;
}

.el-menu-item {
  border-radius: 4px;
  margin: 0 4px;
}

.el-menu-item:hover {
  color: $lamp-color-neutral-dark !important;
  background-color: rgba($lamp-color-neutral-grey, 0.2) !important;
}

.menu-item__title {
  color: $lamp-color-neutral-dark;
}

.menu-item__shortcut {
  color: rgba($lamp-color-neutral-grey, 0.7);
  font-size: 11px;
}

/* 窗口控制按钮 */
.window-controls {
  display: flex;
  align-items: stretch;
  -webkit-app-region: no-drag;
  background-color: #F2F2F2;
  border-bottom: 1px solid rgba($lamp-color-neutral-grey, 0.2);
}

.win-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0;
  background-color: transparent;
  color: $lamp-color-neutral-dark;
  cursor: default;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba($lamp-color-neutral-grey, 0.15);
  }
}

.win-btn--close {
  &:hover {
    background-color: #E81123;
    color: #fff;
  }
}

.win-icon {
  width: 10px;
  height: 10px;
  fill: currentColor;
  pointer-events: none;
}
</style>
