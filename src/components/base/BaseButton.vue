<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => [
      'primary',
      'secondary',
      'crema',
      'outline',
      'ghost',
      'danger'
    ].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  pill: {
    type: Boolean,
    default: false
  },
  circle: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button'
  }
})

defineEmits(['click'])

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'btn-brew-primary'
    case 'secondary':
    case 'outline':
      return 'btn-brew-secondary'
    case 'crema':
      return 'btn-brew-crema'
    case 'danger':
      return 'btn-brew-danger'
    case 'ghost':
      return 'btn-brew-ghost'
    default:
      return 'btn-brew-primary'
  }
})

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'btn-brew-sm'
  if (props.size === 'lg') return 'btn-brew-lg'
  return 'btn-brew-md'
})

const buttonClasses = computed(() => [
  'btn',
  'd-inline-flex',
  'align-items-center',
  'justify-content-center',
  variantClass.value,
  sizeClass.value,
  {
    'rounded-pill': props.pill,
    'btn-circle': props.circle,
    'w-100': props.block,
    'active': props.active,
    'disabled': props.disabled || props.loading
  }
])
</script>

<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span
      v-if="loading"
      class="spinner-border spinner-border-sm me-2"
      role="status"
      aria-hidden="true"
    ></span>

    <span v-if="$slots.prefix && !loading" class="me-1 d-inline-flex align-items-center">
      <slot name="prefix"></slot>
    </span>

    <span class="d-inline-flex align-items-center gap-1 font-numeric">
      <slot></slot>
    </span>

    <span v-if="$slots.suffix && !loading" class="ms-1 d-inline-flex align-items-center">
      <slot name="suffix"></slot>
    </span>
  </button>
</template>

<style scoped>
.btn {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  user-select: none;
}

.btn-brew-sm {
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
}

.btn-brew-md {
  height: 44px;
  padding: 0 16px;
  font-size: 14px;
}

.btn-brew-lg {
  height: 52px;
  padding: 0 22px;
  font-size: 15px;
  font-weight: 600;
}

.btn-circle {
  border-radius: 50% !important;
  padding: 0 !important;
}
.btn-circle.btn-brew-sm {
  width: 32px;
  height: 32px;
}
.btn-circle.btn-brew-md {
  width: 38px;
  height: 38px;
}
.btn-circle.btn-brew-lg {
  width: 48px;
  height: 48px;
}

.btn-brew-primary {
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
  color: var(--on-primary, #ffffff);
}
.btn-brew-primary:hover:not(:disabled),
.btn-brew-primary:focus-visible,
.btn-brew-primary.active {
  background-color: var(--primary-dark, #1d100b) !important;
  border-color: var(--primary-dark, #1d100b) !important;
  color: #ffffff !important;
}

.btn-brew-secondary {
  background-color: var(--surface-container-lowest, #ffffff);
  border-color: var(--border-subtle, #e5e7eb);
  color: var(--on-surface, #1c1b1b);
}
.btn-brew-secondary:hover:not(:disabled) {
  background-color: var(--background, #faf9f7);
  border-color: var(--border-hairline, #e6e4e0);
  color: var(--on-surface, #1c1b1b);
}
.btn-brew-secondary.active {
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
  color: #ffffff;
}

.btn-brew-crema {
  background-color: var(--secondary-fixed, #ffdcc5);
  border-color: transparent;
  color: var(--on-secondary-fixed, #2b1707);
  font-weight: 600;
}
.btn-brew-crema:hover:not(:disabled) {
  background-color: var(--secondary-container, #ffd8bf);
  color: var(--on-secondary-container, #7a5c48);
}

.btn-brew-ghost {
  background-color: transparent;
  border-color: transparent;
  color: var(--on-surface-variant, #504440);
}
.btn-brew-ghost:hover:not(:disabled) {
  background-color: var(--border-hairline, #e6e4e0);
  color: var(--on-surface, #1c1b1b);
}

.btn-brew-danger {
  background-color: var(--error, #ba1a1a);
  border-color: var(--error, #ba1a1a);
  color: #ffffff;
}
.btn-brew-danger:hover:not(:disabled) {
  background-color: #93000a;
  border-color: #93000a;
  color: #ffffff;
}

.font-numeric {
  font-feature-settings: 'tnum' 1;
}
</style>
