<template>
    <BubbleMenu v-if="editor && pluginHost.contributions.sortedBubbleMenu.length > 0" :editor="editor"
        :should-show="({ state }) => !state.selection.empty">
        <menu class="menu-select shadow">
            <li v-for="item in pluginHost.contributions.sortedBubbleMenu" :key="item.id">
                <button class="button" @click="invokeAction(item.pluginId, item.action)">
                    <component v-if="item.icon && lucideIconMap[item.icon]" :is="lucideIconMap[item.icon]" :size="14"
                        class="icon" aria-hidden="true" />
                    <span class="label">{{ resolveLabel(item.label) }}</span>
                </button>
            </li>
        </menu>
    </BubbleMenu>
</template>

<script setup>
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { pluginHost } from '@/plugins/index'
import { lucideIconMap } from './icons'

defineProps({
    editor: { type: Object, default: null },
    resolveLabel: { type: Function, required: true },
    invokeAction: { type: Function, required: true },
})
</script>
