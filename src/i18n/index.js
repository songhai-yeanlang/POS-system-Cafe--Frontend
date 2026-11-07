import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/km'
import en from '@/locales/en.json'
import km from '@/locales/km.json'

const STORAGE_KEY = 'brewpos_locale'

const messages = {
  en,
  km
}

const savedLocale = localStorage.getItem(STORAGE_KEY)
const initialLocale = savedLocale === 'en' || savedLocale === 'km' ? savedLocale : 'km'

export const locale = ref(initialLocale)

function applyDomAndDayjsLocale(lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
  dayjs.locale(lang === 'km' ? 'km' : 'en')
}

applyDomAndDayjsLocale(initialLocale)

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
}

export function t(key, params = {}) {
  const currentLang = locale.value
  let raw = getNestedValue(messages[currentLang], key)
  if (raw === undefined) {
    raw = getNestedValue(messages.en, key)
  }
  if (raw === undefined) {
    return key
  }
  if (typeof raw !== 'string') {
    return raw
  }
  return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`))
}

export function setLocale(lang) {
  if (!messages[lang]) return
  locale.value = lang
  localStorage.setItem(STORAGE_KEY, lang)
  applyDomAndDayjsLocale(lang)
}

export function toggleLocale() {
  setLocale(locale.value === 'km' ? 'en' : 'km')
}

export function useI18n() {
  const isKhmer = computed(() => locale.value === 'km')
  return {
    locale,
    isKhmer,
    t,
    setLocale,
    toggleLocale
  }
}

export default {
  install(app) {
    app.config.globalProperties.$t = t
    app.config.globalProperties.$locale = locale
    app.config.globalProperties.$setLocale = setLocale
    app.config.globalProperties.$toggleLocale = toggleLocale
  }
}
