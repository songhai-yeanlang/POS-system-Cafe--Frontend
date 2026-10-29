<script setup>
import { computed, ref, useId } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
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
  clearable: {
    type: Boolean,
    default: false
  },
  passwordToggle: {
    type: Boolean,
    default: true
  },
  shortcut: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  id: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'focus', 'blur', 'clear', 'enter'])

const generatedId = useId()
const inputId = computed(() => props.id || `input-${generatedId}`)

const inputRef = ref(null)
const showPassword = ref(false)

const currentInputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const hasValue = computed(() => {
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
  emit('input', event)
}

const clearInput = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
  inputRef.value?.focus()
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  inputRef
})
</script>

<template>
  <div class="mb-3">
    <div v-if="label || $slots.label || $slots.action" class="d-flex justify-content-between align-items-center mb-1">
      <label :for="inputId" class="form-label mb-0 fw-medium small text-label">
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="text-danger ms-1">*</span>
      </label>
      <div v-if="$slots.action">
        <slot name="action"></slot>
      </div>
    </div>

    <div
      class="input-group"
      :class="{
        'input-group-sm': size === 'sm',
        'input-group-lg': size === 'lg',
        'is-invalid-group': !!error,
        'rounded-pill-group': pill
      }"
    >
      <span
        v-if="$slots.prefix || type === 'search'"
        class="input-group-text bg-white text-muted"
      >
        <slot name="prefix">
          <svg v-if="type === 'search'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </slot>
      </span>

      <input
        :id="inputId"
        ref="inputRef"
        :type="currentInputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autofocus="autofocus"
        class="form-control"
        :class="{
          'form-control-sm': size === 'sm',
          'form-control-lg': size === 'lg'
        }"
        @input="onInput"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
        @keydown.enter="$emit('enter', $event)"
      />

      <span
        v-if="clearable && hasValue && !disabled && !readonly"
        class="input-group-text bg-white text-muted p-1"
      >
        <button
          type="button"
          class="btn btn-sm btn-link text-muted p-0 text-decoration-none"
          tabindex="-1"
          @click.stop="clearInput"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </button>
      </span>

      <span
        v-if="type === 'password' && passwordToggle && !disabled"
        class="input-group-text bg-white text-muted"
      >
        <button
          type="button"
          class="btn btn-sm btn-link text-muted p-0 text-decoration-none"
          tabindex="-1"
          @click.stop="togglePasswordVisibility"
        >
          <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        </button>
      </span>

      <span
        v-if="shortcut"
        class="input-group-text bg-white"
      >
        <span class="badge border small text-muted bg-light">{{ shortcut }}</span>
      </span>

      <span
        v-if="$slots.suffix"
        class="input-group-text bg-white"
      >
        <slot name="suffix"></slot>
      </span>
    </div>

    <div v-if="error" class="error-text">
      {{ error }}
    </div>
    <div v-else-if="hint" class="form-text text-muted small mt-1">
      {{ hint }}
    </div>
  </div>
</template>

<style scoped>
.text-label {
  color: var(--on-surface, #1c1b1b);
}

.input-group {
  box-shadow: none !important;
  display: flex;
  flex-wrap: nowrap;
}

.input-group > :first-child {
  border-top-left-radius: 8px !important;
  border-bottom-left-radius: 8px !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.input-group > :last-child {
  border-top-right-radius: 8px !important;
  border-bottom-right-radius: 8px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.input-group > :only-child {
  border-radius: 8px !important;
}

.input-group > :not(:first-child):not(:last-child) {
  border-radius: 0 !important;
}

.input-group > :not(:last-child) {
  border-right: none !important;
}

.input-group > :not(:first-child) {
  border-left: none !important;
  margin-left: 0 !important;
}

.input-group.rounded-pill-group > :first-child {
  border-top-left-radius: 9999px !important;
  border-bottom-left-radius: 9999px !important;
}

.input-group.rounded-pill-group > :last-child {
  border-top-right-radius: 9999px !important;
  border-bottom-right-radius: 9999px !important;
}

.input-group.rounded-pill-group > :only-child {
  border-radius: 9999px !important;
}

.form-control {
  border: 1px solid var(--border-subtle, #e5e7eb);
  background-color: var(--surface-container-lowest, #ffffff);
  height: 44px;
  font-size: 14px;
  font-family: var(--font-family, 'Inter', sans-serif);
  box-shadow: none !important;
  outline: none !important;
}

.form-control-sm {
  height: 36px;
  font-size: 13px;
}

.form-control-lg {
  height: 52px;
  font-size: 15px;
}

.form-control::placeholder {
  color: var(--on-surface-variant, #6b7280);
}

.input-group-text {
  border: 1px solid var(--border-subtle, #e5e7eb);
  background-color: var(--surface-container-lowest, #ffffff);
  box-shadow: none !important;
}

.form-control:focus,
.input-group:focus-within .input-group-text,
.input-group:focus-within .form-control {
  border-color: var(--primary, #2c1810) !important;
  box-shadow: none !important;
}

.input-group.is-invalid-group .form-control,
.input-group.is-invalid-group .input-group-text,
.input-group.is-invalid-group:focus-within .form-control,
.input-group.is-invalid-group:focus-within .input-group-text {
  border-color: var(--error, #ba1a1a) !important;
}

.error-text {
  color: var(--error, #ba1a1a) !important;
  font-size: 13px;
  font-weight: 500;
  margin-top: 6px;
}
</style>
