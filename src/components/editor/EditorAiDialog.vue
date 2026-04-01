<template>
    <Dialog v-model:open="aiDialogOpen">
        <DialogContent :showCloseButton="false">
            <DialogHeader v-if="pluginHost.aiState.isLoading">
                <div class="flex flex-col items-center gap-3 py-2">
                    <Sparkles :size="24" class="text-primary animate-pulse" />
                    <DialogTitle class="text-lg font-semibold mb-2">{{ resolveLabel(pluginHost.aiState.actionLabel) }}
                    </DialogTitle>
                    <p class="text-sm text-muted-foreground">请稍候...</p>
                </div>
            </DialogHeader>

            <DialogHeader v-else-if="pluginHost.aiState.error">
                <div class="flex items-start gap-3">
                    <AlertCircle :size="22" class="text-destructive shrink-0 mt-0.5" />
                    <div>
                        <DialogTitle class="text-lg font-semibold mb-2">AI 操作失败</DialogTitle>
                        <DialogDescription class="mt-1">{{ pluginHost.aiState.error }}</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <DialogFooter v-if="pluginHost.aiState.error">
                <Button variant="secondary" @click="dismissAiError">知道了</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import { pluginHost } from '@/plugins/index'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'
import Button from '@/components/ui/button/Button.vue'
import { AlertCircle, Sparkles } from './icons'

defineProps({
    resolveLabel: { type: Function, required: true },
})

const aiDialogOpen = computed({
    get() {
        return !!(pluginHost.aiState.isLoading || pluginHost.aiState.error)
    },
    set() {
        // Dialog close is controlled by aiState transitions.
    },
})

function dismissAiError() {
    pluginHost.aiState.error = null
}
</script>
