<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="placeholder-wrapper mx-auto">
    <div class="placeholder-card bg-white p-4 p-md-5 text-center">
      <div class="icon-box mx-auto mb-3 d-flex align-items-center justify-content-center">
        <i :class="['bi', route.meta?.icon || 'bi-grid', 'fs-4']"></i>
      </div>
      <h5 class="fw-semibold mb-1">{{ route.meta?.title || 'Page' }}</h5>
      <p class="text-muted small mb-0">
        {{ route.meta?.description || 'This page will be implemented in the next step.' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.placeholder-wrapper {
  max-width: 540px;
}

.placeholder-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--primary, #2d5a43);
}
</style>
