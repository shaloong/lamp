<script setup>
import { SelectValue } from "reka-ui"

const props = defineProps({
  asChild: Boolean,
  placeholder: { type: [String, Number], default: undefined },
})
</script>

<template>
  <SelectValue
    data-slot="select-value"
    v-bind="props"
  >
    <slot />
  </SelectValue>
</template>
