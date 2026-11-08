<template>
  <div ref="dropdownRef" class="lang-dropdown">
    <button
      type="button"
      class="lang-trigger-btn border-none"
      :title="locale === 'km' ? 'ភាសាខ្មែរ (ចុចដើម្បីប្ដូរភាសា)' : 'English (Click to change language)'"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <!-- Cambodia Flag SVG -->
      <svg
        v-if="locale === 'km'"
        class="flag-svg"
        viewBox="0 0 36 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="36" height="24" rx="3" fill="#032EA1" />
        <rect y="6" width="36" height="12" fill="#E00025" />
        <!-- Angkor Wat Silhouette -->
        <path
          d="M18 7.5L16.7 10.2H19.3L18 7.5ZM14.2 9.2L13.2 11.2H15.2L14.2 9.2ZM21.8 9.2L20.8 11.2H22.8L21.8 9.2ZM12 11.2H24V13.2H12V11.2ZM10.5 13.2H25.5V14.8H10.5V13.2ZM9.5 14.8H26.5V16.2H9.5V14.8Z"
          fill="#FFFFFF"
        />
      </svg>

      <!-- UK/US English Flag SVG -->
      <svg
        v-else
        class="flag-svg"
        viewBox="0 0 36 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="36" height="24" rx="3" fill="#012169" />
        <path d="M0 0L36 24M36 0L0 24" stroke="#FFFFFF" stroke-width="4" />
        <path d="M0 0L36 24M36 0L0 24" stroke="#C8102E" stroke-width="2" />
        <path d="M18 0V24M0 12H36" stroke="#FFFFFF" stroke-width="6" />
        <path d="M18 0V24M0 12H36" stroke="#C8102E" stroke-width="3.6" />
      </svg>

      <i class="bi bi-chevron-down lang-chevron" :class="{ open: isOpen }"></i>
    </button>

    <transition name="lang-fade">
      <div v-if="isOpen" class="lang-menu" role="menu">
        <button
          type="button"
          class="lang-menu-item"
          :class="{ active: locale === 'km' }"
          role="menuitem"
          @click="selectLang('km')"
        >
          <svg class="flag-svg-sm" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="24" rx="3" fill="#032EA1" />
            <rect y="6" width="36" height="12" fill="#E00025" />
            <path
              d="M18 7.5L16.7 10.2H19.3L18 7.5ZM14.2 9.2L13.2 11.2H15.2L14.2 9.2ZM21.8 9.2L20.8 11.2H22.8L21.8 9.2ZM12 11.2H24V13.2H12V11.2ZM10.5 13.2H25.5V14.8H10.5V13.2ZM9.5 14.8H26.5V16.2H9.5V14.8Z"
              fill="#FFFFFF"
            />
          </svg>
          <span class="flex-grow-1 text-start">ភាសាខ្មែរ</span>
          <i v-if="locale === 'km'" class="bi bi-check2 lang-check"></i>
        </button>

        <button
          type="button"
          class="lang-menu-item"
          :class="{ active: locale === 'en' }"
          role="menuitem"
          @click="selectLang('en')"
        >
          <svg class="flag-svg-sm" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="24" rx="3" fill="#012169" />
            <path d="M0 0L36 24M36 0L0 24" stroke="#FFFFFF" stroke-width="4" />
            <path d="M0 0L36 24M36 0L0 24" stroke="#C8102E" stroke-width="2" />
            <path d="M18 0V24M0 12H36" stroke="#FFFFFF" stroke-width="6" />
            <path d="M18 0V24M0 12H36" stroke="#C8102E" stroke-width="3.6" />
          </svg>
          <span class="flex-grow-1 text-start">English</span>
          <i v-if="locale === 'en'" class="bi bi-check2 lang-check"></i>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/i18n'

const { locale, setLocale } = useI18n()
const isOpen = ref(false)
const dropdownRef = ref(null)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectLang(lang) {
  setLocale(lang)
  isOpen.value = false
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.lang-dropdown {
  position: relative;
  display: inline-block;
}

.lang-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  background-color: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #e6e2dc);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.lang-trigger-btn:hover {
  background-color: var(--bg-app, #f6f4f0);
  border-color: #d0c9c0;
}

.flag-svg {
  width: 24px;
  height: 16px;
  border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.flag-svg-sm {
  width: 22px;
  height: 15px;
  border-radius: 2.5px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.lang-chevron {
  font-size: 11px;
  color: var(--text-secondary, #6b635b);
  transition: transform 0.18s ease;
}

.lang-chevron.open {
  transform: rotate(180deg);
}

.lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 150px;
  background: #ffffff;
  border: 1px solid #e6e2dc;
  border-radius: 12px;
  padding: 5px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1050;
}

.lang-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #1c1917;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.lang-menu-item:hover {
  background-color: #f5f3ef;
}

.lang-menu-item.active {
  background-color: #eef5f1;
  color: var(--color-primary, #2d5a43);
  font-weight: 600;
}

.lang-check {
  font-size: 15px;
  color: var(--color-primary, #2d5a43);
}

.lang-fade-enter-active,
.lang-fade-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.lang-fade-enter-from,
.lang-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
