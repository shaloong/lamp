<script setup>
import { Primitive } from "reka-ui"
import { cn } from "@/lib/utils"
import { buttonVariants } from "./index.js"

const props = defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  as: { type: [String, Object], default: 'button' },
  asChild: Boolean,
  class: String,
})
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
