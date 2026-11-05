<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const getIconClass = (type) => {
  switch (type) {
    case 'success':
      return 'bi-check-circle-fill text-success'
    case 'error':
      return 'bi-exclamation-circle-fill text-danger'
    case 'warning':
      return 'bi-exclamation-triangle-fill text-warning'
    default:
      return 'bi-info-circle-fill text-dark'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack position-fixed bottom-0 end-0 p-3">
      <TransitionGroup name="toast-fade">
        <div
          v-for="item in toasts"
          :key="item.id"
          class="toast-card d-flex align-items-center justify-content-between gap-3 bg-white px-3 py-2 mt-2"
          role="status"
        >
          <div class="d-flex align-items-center gap-2">
            <i :class="['bi', getIconClass(item.type), 'fs-6']"></i>
            <span class="toast-message">{{ item.message }}</span>
          </div>

          <button
            type="button"
            class="btn-close-toast d-flex align-items-center justify-content-center"
            aria-label="Close"
            @click="remove(item.id)"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  z-index: 2000;
  max-width: 380px;
  width: 100%;
  pointer-events: none;
}

.toast-card {
  pointer-events: auto;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  box-shadow: 0 8px 24px -4px rgba(28, 27, 27, 0.08);
}

.toast-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface, #1c1b1b);
  line-height: 1.4;
}

.btn-close-toast {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--outline, #827470);
  border-radius: 6px;
  padding: 0;
  font-size: 16px;
  flex-shrink: 0;
}

.btn-close-toast:hover {
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface, #1c1b1b);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.2s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
