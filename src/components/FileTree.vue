<script setup>
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-vue-next'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  expandedKeys: { type: Array, default: () => [] },
  height: { type: Number, default: 300 },
  depth: { type: Number, default: 0 },
  selectedPath: { type: String, default: '' },
})

const emit = defineEmits(['node-click', 'toggle-expand'])

function isExpanded(node) {
  return props.expandedKeys.includes(node.path)
}

function handleClick(node) {
  emit('node-click', node)
}

function handleChevronClick(node, event) {
  event.stopPropagation()
  emit('toggle-expand', node.path)
}
</script>

<template>
  <ScrollArea class="flex-1" :style="{ height: height + 'px' }">
    <div class="py-1">
      <div v-for="node in data" :key="node.path">
        <div
          class="flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-xs hover:bg-muted transition-colors"
          :class="{
            'bg-accent': selectedPath === node.path,
            'opacity-40': !node.isDirectory && !node.isSupported,
          }"
          :style="{ paddingLeft: (depth * 14 + 8) + 'px' }"
          @click="handleClick(node)"
        >
          <component
            :is="isExpanded(node) ? ChevronDown : ChevronRight"
            v-if="node.isDirectory"
            :size="12"
            class="shrink-0 text-muted-foreground cursor-pointer"
            @click.stop="handleChevronClick(node, $event)"
          />
          <span v-else class="shrink-0 w-3" />

          <component
            :is="node.isDirectory ? (isExpanded(node) ? FolderOpen : Folder) : File"
            :size="16"
            class="shrink-0"
            :class="node.isDirectory ? 'text-primary' : 'text-muted-foreground'"
          />

          <span class="truncate text-foreground">{{ node.name }}</span>
        </div>

        <FileTree
          v-if="node.isDirectory && isExpanded(node)"
          :data="node.children || []"
          :expandedKeys="expandedKeys"
          :height="height"
          :depth="depth + 1"
          :selectedPath="selectedPath"
          @node-click="$emit('node-click', $event)"
          @toggle-expand="$emit('toggle-expand', $event)"
        />
      </div>
    </div>
  </ScrollArea>
</template>
