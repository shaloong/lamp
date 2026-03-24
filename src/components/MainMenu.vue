<script setup>
import '@/assets/iconfont.js'
import { useWorkspaceStore } from '@/stores/workspace'

const workspaceStore = useWorkspaceStore()
</script>

<template>
  <el-menu class="main-menu" popper-class="popper" mode="horizontal" background-color="#F2F2F2" :unique-opened="true"
    :collapse-transition="false" :show-timeout=50 :hide-timeout=50 menu-trigger="hover">
    <img style="margin: 0 10px 0 15px; width: 18px;" src="/src/assets/lamp-icon.svg" alt="Lamp Logo" />
    <el-sub-menu index="file">
      <template #title>文件</template>
      <el-menu-item>新建</el-menu-item>
      <el-menu-item @click="fileOpen">
        <div class="menu-item__title">打开文件</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+O</div>
      </el-menu-item>
      <el-menu-item @click="openWorkspace" v-if="!workspaceStore.isOpen">
        <div class="menu-item__title">打开工作区</div>
      </el-menu-item>
      <el-menu-item @click="closeWorkspace" v-if="workspaceStore.isOpen">
        <div class="menu-item__title">关闭工作区</div>
      </el-menu-item>
      <el-divider />
      <el-menu-item @click="fileSave">
        <div class="menu-item__title">保存</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+S</div>
      </el-menu-item>
      <el-menu-item @click="fileSaveAs">
        <div class="menu-item__title">另存为</div>
      </el-menu-item>
      <el-menu-item @click="closeWindow">关闭</el-menu-item>
    </el-sub-menu>
    <el-sub-menu index="edit">
      <template #title>编辑</template>
      <el-menu-item @click="editUndo">
        <div class="menu-item__title">撤销</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+Z</div>
      </el-menu-item>
      <el-menu-item @click="editRedo">
        <div class="menu-item__title">重做</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+Y</div>
      </el-menu-item>
      <el-menu-item @click="editCut">
        <div class="menu-item__title">剪切</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+X</div>
      </el-menu-item>
      <el-menu-item @click="editCopy">
        <div class="menu-item__title">复制</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+C</div>
      </el-menu-item>
      <el-menu-item @click="editPaste">
        <div class="menu-item__title">粘贴</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+V</div>
      </el-menu-item>
      <el-menu-item @click="editSelectAll">
        <div class="menu-item__title">全选</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Ctrl+A</div>
      </el-menu-item>
      <el-menu-item @click="editDelete">
        <div class="menu-item__title">删除</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">Del</div>
      </el-menu-item>
    </el-sub-menu>
    <el-sub-menu index="view">
      <template #title>视图</template>
      <!--      <el-menu-item>放大</el-menu-item>-->
      <!--      <el-menu-item>缩小</el-menu-item>-->
      <el-menu-item @click="viewFullScreen">
        <div class="menu-item__title">全屏</div>
        <div class="flex-grow" />
        <div class="menu-item__shortcut">F11</div>
      </el-menu-item>
    </el-sub-menu>
    <el-sub-menu index="settings">
      <template #title>设置</template>
      <el-menu-item @click="openSettings">
        <div class="menu-item__title">AI 接口</div>
      </el-menu-item>
    </el-sub-menu>
    <div class="flex-grow" />
    <button class="window-btn" @click.stop="minWindow();">
      <svg class="window-icon" aria-hidden="true">
        <use xlink:href="#icon-minimize"></use>
      </svg>
    </button>
    <button class="window-btn" @click.stop="maxWindow();">
      <svg class="window-icon" aria-hidden="true">
        <use xlink:href="#icon-maximize1"></use>
      </svg>
    </button>
    <button class="window-close-btn" @click.stop="closeWindow();">
      <svg class="window-icon" aria-hidden="true">
        <use xlink:href="#icon-close"></use>
      </svg>
    </button>
  </el-menu>
</template>

<script>
export default {
  props: {
    fileOpen: {
      type: Function,
      required: true
    },
    fileSave: {
      type: Function,
      required: true
    },
    fileSaveAs: {
      type: Function,
      required: true
    },
    editUndo: {
      type: Function,
      required: true
    },
    editRedo: {
      type: Function,
      required: true
    },
    editCut: {
      type: Function,
      required: true
    },
    editCopy: {
      type: Function,
      required: true
    },
    editPaste: {
      type: Function,
      required: true
    },
    editDelete: {
      type: Function,
      required: true
    },
    editSelectAll: {
      type: Function,
      required: true
    },
    viewFullScreen: {
      type: Function,
      required: true
    },
    minWindow: {
      type: Function,
      required: true
    },
    maxWindow: {
      type: Function,
      required: true
    },
    closeWindow: {
      type: Function,
      required: true
    },
    openSettings: {
      type: Function,
      required: true
    },
    openWorkspace: {
      type: Function,
      required: false,
      default: () => { }
    },
    closeWorkspace: {
      type: Function,
      required: false,
      default: () => { }
    },
  },

}
</script>

<style lang="scss">
@use "@/styles/element/index" as *;
@use "@/styles/style" as *;

.flex-grow {
  flex-grow: 1;
}

.main-menu {
  position: absolute;
  top: 0;
  width: 100%;
  height: 38px;
  -webkit-app-region: drag;
  border: 0 !important;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-bottom: 1px solid rgba($lamp-color-neutral-grey, 0.2) !important;
}

.el-menu-item,
.el-sub-menu,
.window-btn {
  background-color: transparent;
  -webkit-app-region: no-drag;
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
  color: $lamp-color-neutral-grey;
  font-size: 11px;
}

.window-btn {
  border: 0;
  border-radius: 0;
  width: 40px;
}

.window-btn:hover {
  border: 0;
  background-color: rgba($lamp-color-neutral-grey, 0.1);
}

.window-close-btn {
  border: 0;
  border-radius: 0;
  width: 40px;
  background-color: transparent;
}

.window-close-btn:hover {
  border: 0;
  background-color: #E81123;

  & .window-icon {
    fill: #fff;
  }
}

.window-icon {
  width: 12px;
  height: 12px;
}
</style>