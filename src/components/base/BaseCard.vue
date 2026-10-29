<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'flat', 'elevated', 'interactive'].includes(v),
  },
  padding: {
    type: String,
    default: 'md',
    validator: (v) => ['none', 'sm', 'md', 'lg'].includes(v),
  },
  rounded: {
    type: String,
    default: '4',
    validator: (v) => ['0', '1', '2', '3', '4', '5'].includes(v),
  },
  border: {
    type: Boolean,
    default: true,
  },
  image: {
    type: String,
    default: '',
  },
  imageAlt: {
    type: String,
    default: 'Card image',
  },
  aspectRatio: {
    type: String,
    default: '4x3',
    validator: (v) => ['16x9', '4x3', '1x1', '21x9'].includes(v),
  },
})

defineEmits(['click'])

const cardClasses = computed(() => [
  'card',
  'h-100',
  'position-relative',
  'overflow-hidden',
  `rounded-${props.rounded}`,
  {
    'border-0': !props.border || props.variant === 'flat',
    'shadow-subtle': props.variant === 'elevated',
    'card-interactive': props.variant === 'interactive',
    'bg-white': true,
  },
])

const bodyPaddingClass = computed(() => {
  switch (props.padding) {
    case 'none':
      return 'p-0'
    case 'sm':
      return 'p-2'
    case 'lg':
      return 'p-4'
    default:
      return 'p-3'
  }
})
</script>

<template>
  <div :class="cardClasses" @click="$emit('click', $event)">
    <div v-if="image || $slots.media" class="position-relative p-2 pb-0">
      <div class="ratio overflow-hidden rounded-3 bg-light" :class="`ratio-${aspectRatio}`">
        <slot name="media">
          <img
            v-if="image"
            :src="image"
            :alt="imageAlt"
            class="card-img-top object-fit-cover w-100 h-100"
            loading="lazy"
          />
        </slot>
      </div>

      <div v-if="$slots.badge" class="position-absolute top-0 start-0 m-3 z-1">
        <slot name="badge"></slot>
      </div>
    </div>

    <div
      v-if="$slots.header"
      class="card-header bg-transparent border-bottom-0 pb-0"
      :class="bodyPaddingClass"
    >
      <slot name="header"></slot>
    </div>

    <div class="card-body d-flex flex-column" :class="bodyPaddingClass">
      <slot></slot>
    </div>

    <div
      v-if="$slots.footer"
      class="card-footer bg-transparent border-top-0 pt-0 d-flex align-items-center justify-content-between"
      :class="bodyPaddingClass"
    >
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-color: var(--surface-container-lowest, #ffffff);
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  transition: border-color 0.15s ease;
}

.shadow-subtle {
  box-shadow: 0 4px 12px rgba(44, 24, 16, 0.04);
}

.card-interactive {
  cursor: pointer;
  user-select: none;
}

.card-interactive:hover {
  border-color: var(--primary, #2c1810) !important;
}
</style>
