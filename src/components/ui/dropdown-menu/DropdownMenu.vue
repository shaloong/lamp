<script setup>
import { DropdownMenuRoot, useForwardPropsEmits } from "reka-ui"

const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  modal: { type: Boolean, default: true },
})
const emits = defineEmits(['update:open'])

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DropdownMenuRoot
    v-slot="slotProps"
    data-slot="dropdown-menu"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </DropdownMenuRoot>
</template>
