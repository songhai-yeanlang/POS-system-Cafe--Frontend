<template>
  <router-view />
  <BaseToast />
</template>

<script setup>
import BaseToast from '@/components/base/BaseToast.vue'
import { useAppStore } from '@/stores/appStore'

// Initialize appStore so browser favicon syncs with shop logo across all pages
useAppStore()
</script>

<style scoped></style>
