<template>
  <Teleport to="body">
    <Transition name="ai-toolbar">
      <div v-if="visible" class="ai-suggest-toolbar" :style="toolbarStyle" @mousedown.prevent>
        <div class="ai-toolbar-meta">
          <span class="ai-toolbar-label">
            <svg class="ai-toolbar-star" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 1.5L9.72 5.51L14.3 6.18L11.15 9.22L11.91 13.82L8 11.69L4.09 13.82L4.85 9.22L1.7 6.18L6.28 5.51L8 1.5Z"
                stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            </svg>
            {{ currentLabel }}
          </span>
          <span class="ai-toolbar-hints">
            <kbd>Tab</kbd> 应用 · <kbd>Esc</kbd> 放弃
          </span>
        </div>
        <div class="ai-toolbar-actions">
          <button class="ai-btn ai-btn-dismiss" title="放弃 (Esc)" @click="dismiss">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
          <button class="ai-btn ai-btn-accept" title="应用 (Tab)" @click="accept">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { pluginHost } from '../plugins/index';

export default {
  props: {
    editor: {
      type: Object,
      default: null,
    },
  },

  data() {
    return {
      top: 0,
      left: 0,
      visible: false,
      currentLabel: '',
    };
  },

  computed: {
    toolbarStyle() {
      return {
        top: `${this.top}px`,
        left: `${this.left}px`,
        transform: 'translateY(-100%)',
      };
    },
  },

  methods: {
    _update() {
      const s = pluginHost.aiState.suggestion;
      if (!s || !this.editor) {
        this.visible = false;
        return;
      }
      this.currentLabel = s.actionLabel;
      try {
        const coords = this.editor.view.coordsAtPos(s.to);
        this.top = coords.top - 10;
        this.left = coords.left;
        this.visible = true;
      } catch {
        this.visible = false;
      }
    },

    accept() {
      if (!this.editor) return;
      this.visible = false;
      // pluginHost.aiState.suggestion is cleared inside acceptAISuggestion
      this.editor.commands.acceptAISuggestion();
    },

    dismiss() {
      if (!this.editor) return;
      this.visible = false;
      this.editor.commands.dismissAISuggestion();
    },
  },

  mounted() {
    // Re-position on every editor update (scroll, selection change, etc.)
    if (this.editor) {
      this._unwatch = this.editor.on('update', () => this._update());
    }
    // React to new AI suggestions
    this._unwatchAi = this.$watch(
      () => pluginHost.aiState.suggestion,
      (s) => {
        if (s) this.$nextTick(() => this._update());
        else this.visible = false;
      },
      { immediate: true },
    );
  },

  beforeUnmount() {
    this._unwatch?.();
    this._unwatchAi();
  },
};
</script>

<style lang="scss" scoped>
.ai-suggest-toolbar {
  position: fixed;
  z-index: 9100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--lamp-color-neutral-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.24),
    0 1px 4px rgba(0, 0, 0, 0.16);
  user-select: none;
  white-space: nowrap;

  /* Subtle arrow pointing down */
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 14px;
    border: 5px solid transparent;
    border-top-color: var(--lamp-color-neutral-dark);
  }
}

.ai-toolbar-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 6px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-toolbar-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lamp-color-primary);
  letter-spacing: 0.02em;
}

.ai-toolbar-star {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.ai-toolbar-hints {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.01em;

  kbd {
    font-family: inherit;
    font-size: inherit;
    color: rgba(255, 255, 255, 0.55);
  }
}

.ai-toolbar-actions {
  display: flex;
  gap: 3px;
}

.ai-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s ease, opacity 0.12s ease;

  svg {
    width: 14px;
    height: 14px;
  }
}

.ai-btn-accept {
  background: var(--lamp-color-primary);
  color: #fff;

  &:hover {
    background: var(--lamp-btn-primary-hover);
  }

  &:active {
    opacity: 0.85;
  }
}

.ai-btn-dismiss {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.8);
  }

  &:active {
    opacity: 0.75;
  }
}

/* Transition */
.ai-toolbar-enter-active,
.ai-toolbar-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.ai-toolbar-enter-from,
.ai-toolbar-leave-to {
  opacity: 0;
  transform: translateY(calc(-100% - 4px)) !important;
}
</style>
