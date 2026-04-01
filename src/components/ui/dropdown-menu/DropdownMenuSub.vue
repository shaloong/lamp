<script setup>
import {
  DropdownMenuSub,
  useForwardPropsEmits,
} from "reka-ui"

const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
})
const emits = defineEmits(['update:open'])

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DropdownMenuSub v-slot="slotProps" data-slot="dropdown-menu-sub" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DropdownMenuSub>
</template>
