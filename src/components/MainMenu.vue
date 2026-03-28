<script setup>
import { useI18n } from 'vue-i18n'
import '@/assets/iconfont.js'
import { useWorkspaceStore } from '@/stores/workspace'
import { pluginHost } from '../plugins/index'

const { t } = useI18n()

const emit = defineEmits([
  'newFile', 'openFile', 'saveFile', 'saveFileAs', 'closeWindow',
  'editUndo', 'editRedo', 'editCut', 'editCopy', 'editPaste',
  'editSelectAll', 'editDelete',
  'viewFullScreen',
  'openWorkspace', 'closeWorkspace',
  'minWindow', 'maxWindow',
])

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

/**
 * Resolve a label that may be either a plain string or an i18n key.
 * Keys containing a dot (e.g. "ai.polish", "editor.bold") are resolved via t();
 * plain strings are returned as-is.
 */
function resolveLabel(label) {
  return label && label.includes('.') ? t(label) : label
}
</script>

<template>
  <div class="main-menu-bar">
    <el-menu class="main-menu" popper-class="popper" mode="horizontal" background-color="#F2F2F2" :unique-opened="true"
      :collapse-transition="false" :show-timeout="50" :hide-timeout="50" menu-trigger="hover">
      <img style="margin: 0 10px 0 15px; width: 18px;" src="/src/assets/lamp-icon.svg" alt="Lamp Logo" />

      <!-- 文件菜单 -->
      <el-sub-menu index="file">
        <template #title>{{ t('menu.file') }}</template>
        <el-menu-item index="file-new" @click="emit('newFile')">{{ t('menu.newFile') }}</el-menu-item>
        <el-menu-item index="file-open" @click="emit('openFile')">
          <div class="menu-item__title">{{ t('menu.openFile') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+O</div>
        </el-menu-item>
        <!-- 来自插件的文件菜单项 -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('file')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ resolveLabel(item.label) }}</div>
            <div class="flex-grow" v-if="item.accelerator" />
            <div class="menu-item__shortcut" v-if="item.accelerator">{{ item.accelerator }}</div>
          </el-menu-item>
        </template>
        <el-divider />
        <el-menu-item index="file-save" @click="emit('saveFile')">
          <div class="menu-item__title">{{ t('menu.save') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+S</div>
        </el-menu-item>
        <el-menu-item index="file-save-as" @click="emit('saveFileAs')">{{ t('menu.saveAs') }}</el-menu-item>
        <el-divider />
        <el-menu-item index="file-close" @click="emit('closeWindow')">{{ t('menu.close') }}</el-menu-item>
      </el-sub-menu>

      <!-- 编辑菜单 -->
      <el-sub-menu index="edit">
        <template #title>{{ t('menu.edit') }}</template>
        <el-menu-item index="edit-undo" @click="emit('editUndo')">
          <div class="menu-item__title">{{ t('menu.undo') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+Z</div>
        </el-menu-item>
        <el-menu-item index="edit-redo" @click="emit('editRedo')">
          <div class="menu-item__title">{{ t('menu.redo') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+Y</div>
        </el-menu-item>
        <el-divider />
        <el-menu-item index="edit-cut" @click="emit('editCut')">
          <div class="menu-item__title">{{ t('menu.cut') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+X</div>
        </el-menu-item>
        <el-menu-item index="edit-copy" @click="emit('editCopy')">
          <div class="menu-item__title">{{ t('menu.copy') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+C</div>
        </el-menu-item>
        <el-menu-item index="edit-paste" @click="emit('editPaste')">
          <div class="menu-item__title">{{ t('menu.paste') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+V</div>
        </el-menu-item>
        <el-menu-item index="edit-select-all" @click="emit('editSelectAll')">
          <div class="menu-item__title">{{ t('menu.selectAll') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Ctrl+A</div>
        </el-menu-item>
        <el-menu-item index="edit-delete" @click="emit('editDelete')">
          <div class="menu-item__title">{{ t('menu.delete') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">Del</div>
        </el-menu-item>
        <!-- 来自插件的编辑菜单项（如 AI 操作） -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('edit')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ resolveLabel(item.label) }}</div>
            <div class="flex-grow" v-if="item.accelerator" />
            <div class="menu-item__shortcut" v-if="item.accelerator">{{ item.accelerator }}</div>
          </el-menu-item>
        </template>
      </el-sub-menu>

      <!-- 视图菜单 -->
      <el-sub-menu index="view">
        <template #title>{{ t('menu.view') }}</template>
        <el-menu-item index="view-fullscreen" @click="emit('viewFullScreen')">
          <div class="menu-item__title">{{ t('menu.fullScreen') }}</div>
          <div class="flex-grow" />
          <div class="menu-item__shortcut">F11</div>
        </el-menu-item>
        <!-- 来自插件的视图菜单项 -->
        <template v-for="item in pluginHost.contributions.getMenuItemsBy('view')" :key="item.id">
          <el-divider v-if="item.separatorBefore" />
          <el-menu-item :index="item.id" @click="invokeAction(item.pluginId, item.action)">
            <div class="menu-item__title">{{ resolveLabel(item.label) }}</div>
            <div class="flex-grow" v-if="item.accelerator" />
            <div class="menu-item__shortcut" v-if="item.accelerator">{{ item.accelerator }}</div>
          </el-menu-item>
        </template>
      </el-sub-menu>

      <!-- 设置菜单 -->
      <!-- 设置入口已移至左侧工具栏 -->
    </el-menu>

    <!-- 窗口控制按钮：位于右上角，与菜单项同一行 -->
    <div class="window-controls">
      <button class="win-btn" @click.stop="emit('minWindow')" title="最小化">
        <svg class="win-icon" aria-hidden="true">
          <use xlink:href="#icon-minimize"></use>
        </svg>
      </button>
      <button class="win-btn" @click.stop="emit('maxWindow')" title="最大化">
        <svg class="win-icon" aria-hidden="true">
          <use xlink:href="#icon-maximize1"></use>
        </svg>
      </button>
      <button class="win-btn win-btn--close" @click.stop="emit('closeWindow')" title="关闭">
        <svg class="win-icon" aria-hidden="true">
          <use xlink:href="#icon-close"></use>
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="scss">

.el-divider--horizontal {
  margin: 4px 0;
}

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
  border-bottom: 1px solid var(--lamp-grey-20) !important;
}

.el-menu--horizontal>.el-menu-item,
.el-menu--horizontal>.el-sub-menu>.el-sub-menu__title {
  height: 38px !important;
  line-height: 38px !important;
}

.el-sub-menu__title {
  color: var(--lamp-color-neutral-dark) !important;
  border-bottom-color: transparent !important;
}

.el-menu-item {
  border-radius: 4px;
  margin: 0 4px;
}

.el-menu-item:hover {
  color: var(--lamp-color-neutral-dark) !important;
  background-color: var(--lamp-grey-20) !important;
}

.menu-item__title {
  color: var(--lamp-color-neutral-dark);
}

.menu-item__shortcut {
  color: var(--lamp-grey-70);
  font-size: 11px;
}

/* 窗口控制按钮 */
.window-controls {
  display: flex;
  align-items: stretch;
  -webkit-app-region: no-drag;
  background-color: #F2F2F2;
  border-bottom: 1px solid var(--lamp-grey-20);
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
  color: var(--lamp-color-neutral-dark);
  cursor: default;
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--lamp-grey-15);
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
