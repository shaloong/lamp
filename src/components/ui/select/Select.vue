<script setup>
import { SelectRoot, useForwardPropsEmits } from "reka-ui"

const props = defineProps({
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: undefined },
  modelValue: { type: [Boolean, String, Number], default: undefined },
  defaultValue: { type: [Boolean, String, Number], default: undefined },
  disabled: { type: Boolean, default: false },
  name: String,
  required: { type: Boolean, default: false },
})
const emits = defineEmits(['update:modelValue'])

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <SelectRoot
    v-slot="slotProps"
    data-slot="select"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </SelectRoot>
</template>
