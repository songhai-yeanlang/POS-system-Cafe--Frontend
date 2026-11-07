<template>
  <div class="lang-switcher" role="group" aria-label="Language Switcher">
    <button
      type="button"
      class="lang-btn"
      :class="{ active: locale === 'km' }"
      @click="setLocale('km')"
      title="ភាសាខ្មែរ (Khmer)"
    >
      <span class="lang-flag">🇰🇭</span>
      <span class="lang-label">ខ្មែរ</span>
    </button>
    <button
      type="button"
      class="lang-btn"
      :class="{ active: locale === 'en' }"
      @click="setLocale('en')"
      title="English"
    >
      <span class="lang-flag">🇺🇸</span>
      <span class="lang-label">EN</span>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'

const { locale, setLocale } = useI18n()
</script>

<style scoped>
.lang-switcher {
  display: inline-flex;
  align-items: center;
  background-color: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 2px;
  gap: 2px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.3;
}

.lang-btn:hover {
  color: var(--text-primary);
}

.lang-btn.active {
  background-color: var(--bg-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}

.lang-flag {
  font-size: 13px;
  line-height: 1;
}
</style>
