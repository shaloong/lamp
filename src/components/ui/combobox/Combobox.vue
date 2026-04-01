<script setup>
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const props = defineProps({
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '' },
    emptyText: { type: String, default: 'No results' },
    suggestionMode: { type: String, default: 'filter' }, // 'filter' | 'all'
    class: String,
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const activeIndex = ref(-1)

const model = computed({
    get: () => String(props.modelValue ?? ''),
    set: (value) => emit('update:modelValue', value),
})

const normalizedOptions = computed(() => {
    return props.options
        .map((option) => {
            if (typeof option === 'string') {
                return { value: option, label: option }
            }
            return {
                value: String(option?.value ?? ''),
                label: String(option?.label ?? option?.value ?? ''),
            }
        })
        .filter((option) => option.value)
})

const filteredOptions = computed(() => {
    const keyword = model.value.trim().toLowerCase()
    if (!keyword) return normalizedOptions.value
    return normalizedOptions.value.filter((option) => {
        return option.value.toLowerCase().includes(keyword) || option.label.toLowerCase().includes(keyword)
    })
})

const displayedOptions = computed(() => {
    return props.suggestionMode === 'all' ? normalizedOptions.value : filteredOptions.value
})

watch(displayedOptions, (next) => {
    if (!next.length) {
        activeIndex.value = -1
        return
    }
    if (activeIndex.value < 0 || activeIndex.value >= next.length) {
        activeIndex.value = 0
    }
})

function openList() {
    open.value = true
    const index = displayedOptions.value.findIndex((option) => option.value === model.value)
    activeIndex.value = index >= 0 ? index : (displayedOptions.value.length ? 0 : -1)
}

function closeList() {
    open.value = false
    activeIndex.value = -1
}

function selectOption(option) {
    emit('update:modelValue', option.value)
    closeList()
}

function onInputBlur() {
    // Defer close to allow option mousedown handlers to commit selection first.
    window.setTimeout(closeList, 80)
}

function onKeydown(event) {
    if (!open.value && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
        openList()
    }

    if (!open.value) return

    if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!displayedOptions.value.length) return
        activeIndex.value = (activeIndex.value + 1 + displayedOptions.value.length) % displayedOptions.value.length
        return
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!displayedOptions.value.length) return
        activeIndex.value = (activeIndex.value - 1 + displayedOptions.value.length) % displayedOptions.value.length
        return
    }

    if (event.key === 'Enter' && activeIndex.value >= 0 && displayedOptions.value[activeIndex.value]) {
        event.preventDefault()
        selectOption(displayedOptions.value[activeIndex.value])
        return
    }

    if (event.key === 'Escape') {
        event.preventDefault()
        closeList()
    }
}
</script>

<template>
    <div data-slot="combobox" :class="cn('relative w-full', props.class)">
        <Input v-model="model" :placeholder="placeholder" class="pr-9" role="combobox" aria-autocomplete="list"
            :aria-expanded="open" @focus="openList" @blur="onInputBlur" @keydown="onKeydown" />
        <button type="button"
            class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" tabindex="-1"
            aria-hidden="true">
            <ChevronDown class="size-4 opacity-50" />
        </button>

        <div v-if="open"
            class="bg-popover text-popover-foreground absolute left-0 top-[calc(100%+4px)] z-50 max-h-56 w-full overflow-auto rounded-md border p-1 shadow-md">
            <button v-for="(option, index) in displayedOptions" :key="option.value" type="button"
                class="relative flex w-full items-center rounded-sm py-1.5 pr-8 pl-2 text-left text-sm outline-none"
                :class="index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'"
                @mouseenter="activeIndex = index" @mousedown.prevent="selectOption(option)">
                <span class="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                    <Check class="size-4" :class="option.value === model ? 'opacity-100' : 'opacity-0'" />
                </span>
                {{ option.label }}
            </button>
            <div v-if="!displayedOptions.length" class="px-2 py-1.5 text-sm text-muted-foreground">
                {{ emptyText }}
            </div>
        </div>
    </div>
</template>
