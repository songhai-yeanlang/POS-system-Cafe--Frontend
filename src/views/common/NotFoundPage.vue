<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
</script>

<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center p-4">
    <div class="not-found-card bg-white p-5 text-center">
      <div class="code-badge mx-auto mb-3 d-inline-flex align-items-center justify-content-center">
        404
      </div>
      <h3 class="fw-bold mb-2">{{ $t('auth.notFoundTitle') }}</h3>
      <p class="text-muted small mb-4">
        {{ $t('auth.notFoundDesc') }}
      </p>
      <BaseButton variant="primary" @click="router.push(authStore.defaultRoute)">
        {{ $t('auth.backToWorkspace') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.not-found-card {
  max-width: 420px;
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.code-badge {
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background-color: var(--secondary-fixed, #d6ede0);
  color: var(--on-secondary-fixed, #2b1707);
  font-weight: 700;
  font-size: 13px;
}
</style>
