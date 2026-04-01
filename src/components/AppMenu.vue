<script setup>
import { pluginHost } from '@/plugins/index'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useI18n } from 'vue-i18n'
import { menuSections } from '@/components/menu/config'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'

const { t } = useI18n()
const emit = defineEmits(['minWindow', 'maxWindow', 'closeWindow'])

const cmd = pluginHost.commandService

function invokeAction(pluginId, action) {
  const ctx = pluginHost.getContext(pluginId)
  if (!ctx) { console.warn(`[AppMenu] Plugin context "${pluginId}" not found.`); return }
  try {
    const result = action(ctx)
    if (result instanceof Promise) {
      result.catch(err => console.error(`[AppMenu] Action failed (${pluginId}):`, err))
    }
  } catch (err) {
    console.error(`[AppMenu] Action error (${pluginId}):`, err)
  }
}

function resolveLabel(label) {
  return resolveI18nLabel(t, label)
}

function pluginMenuItems(area) {
  return pluginHost.contributions.getMenuItemsBy(area)
}
</script>

<template>
  <div class="flex items-stretch h-9.5 bg-muted border-b border-border select-none" style="-webkit-app-region: drag">
    <!-- Logo -->
    <img class="mr-2 ml-3 my-auto w-4.5 h-4.5 pointer-events-none" src="/src/assets/lamp-icon.svg" alt="Lamp" />

    <!-- Menu bar -->
    <nav class="flex-1 flex items-stretch">

      <DropdownMenu v-for="section in menuSections" :key="section.id">
        <DropdownMenuTrigger as-child>
          <button style="-webkit-app-region: no-drag"
            class="flex items-center px-3 h-full text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-default">
            {{ t(section.titleKey) }}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="min-w-44">
          <template v-for="(item, index) in section.items" :key="`${section.id}-${index}`">
            <DropdownMenuSeparator v-if="item.type === 'separator'" />

            <DropdownMenuItem v-else-if="item.type === 'command'" @click="cmd.execute(item.id)">
              <span class="flex-1">{{ t(item.labelKey) }}</span>
              <kbd v-if="item.accelerator"
                class="ml-4 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {{ item.accelerator }}
              </kbd>
            </DropdownMenuItem>

            <template v-else-if="item.type === 'plugin'">
              <template v-for="pluginItem in pluginMenuItems(item.area)" :key="pluginItem.id">
                <DropdownMenuSeparator v-if="pluginItem.separatorBefore" />
                <DropdownMenuItem @click="invokeAction(pluginItem.pluginId, pluginItem.action)">
                  <span class="flex-1">{{ resolveLabel(pluginItem.label) }}</span>
                  <kbd v-if="pluginItem.accelerator"
                    class="ml-4 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {{ pluginItem.accelerator }}
                  </kbd>
                </DropdownMenuItem>
              </template>
            </template>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>

    </nav>

    <!-- Window controls -->
    <div class="flex items-stretch" style="-webkit-app-region: no-drag">
      <button @click.stop="$emit('minWindow')" title="最小化"
        class="w-11.5 h-full flex items-center justify-center hover:bg-accent transition-colors">
        <svg class="w-2.5 h-2.5 text-foreground" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="7" width="12" height="2" />
        </svg>
      </button>
      <button @click.stop="$emit('maxWindow')" title="最大化"
        class="w-11.5 h-full flex items-center justify-center hover:bg-accent transition-colors">
        <svg class="w-2.5 h-2.5 text-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          stroke-width="1.5">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
        </svg>
      </button>
      <button @click.stop="$emit('closeWindow')" title="关闭"
        class="w-11.5 h-full flex items-center justify-center hover:bg-destructive hover:text-white transition-colors">
        <svg class="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
    </div>
  </div>
</template>
