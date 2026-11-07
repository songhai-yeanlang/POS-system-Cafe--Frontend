import dayjs from 'dayjs'
import 'dayjs/locale/km'
import { locale } from '@/i18n'

export function useFormatDate() {
  const formatDateTime = (dateVal, pattern = 'MMM D, YYYY • h:mm A') => {
    if (!dateVal) return '—'
    const d = dayjs(dateVal).locale(locale.value === 'km' ? 'km' : 'en')
    return d.isValid() ? d.format(pattern) : '—'
  }

  const formatDate = (dateVal, pattern = 'MMM D, YYYY') => {
    if (!dateVal) return '—'
    const d = dayjs(dateVal).locale(locale.value === 'km' ? 'km' : 'en')
    return d.isValid() ? d.format(pattern) : '—'
  }

  const formatTime = (dateVal, pattern = 'h:mm A') => {
    if (!dateVal) return '—'
    const d = dayjs(dateVal).locale(locale.value === 'km' ? 'km' : 'en')
    return d.isValid() ? d.format(pattern) : '—'
  }

  return {
    formatDateTime,
    formatDate,
    formatTime,
  }
}
