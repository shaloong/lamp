<script setup>
import { reactiveOmit } from "@vueuse/core"
import { Separator } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps({
  orientation: { type: String, default: 'horizontal' },
  decorative: { type: Boolean, default: true },
  asChild: Boolean,
  class: String,
})

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <Separator
    data-slot="separator"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        props.class,
      )
    "
  />
</template>
