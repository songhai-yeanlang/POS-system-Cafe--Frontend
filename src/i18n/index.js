import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/km'
import en from '@/locales/en.json'
import km from '@/locales/km.json'

const STORAGE_KEY = 'brewpos_locale'
const SESSION_KEY = 'brewpos_session_locale'

const messages = {
  en,
  km
}

// When opening the system (new window / browser launch / fresh session), Khmer ('km') is always the Default.
// Within an active session, if the user explicitly switches language, that choice is remembered for that session.
let initialLocale = 'km'
try {
  if (typeof sessionStorage !== 'undefined') {
    const sessionLocale = sessionStorage.getItem(SESSION_KEY)
    if (sessionLocale === 'en' || sessionLocale === 'km') {
      initialLocale = sessionLocale
    } else {
      // New / fresh session: always default to Khmer ('km')
      sessionStorage.setItem(SESSION_KEY, 'km')
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'km')
      }
    }
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'km')
  }
} catch {
  initialLocale = 'km'
}

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

const CATEGORY_KM_MAP = {
  'signature coffee': 'កាហ្វេប្រចាំហាង',
  'coffe': 'កាហ្វេ',
  'coffee': 'កាហ្វេ',
  'espresso': 'អេសប្រេសសូ',
  'espresso & coffee': 'អេសប្រេសសូ និងកាហ្វេ',
  'hot coffee': 'កាហ្វេក្ដៅ',
  'iced coffee': 'កាហ្វេទឹកកក',
  'cold brew': 'កាហ្វេត្រជាក់ (Cold Brew)',
  'tea': 'តែ',
  'teas': 'តែ',
  'tea & matcha': 'តែ និងម៉ាត់ឆា',
  'matcha': 'ម៉ាត់ឆា',
  'milk tea': 'តែទឹកដោះគោ',
  'fruit tea': 'តែផ្លែឈើ',
  'green tea': 'តែបៃតង',
  'non-coffee': 'ភេសជ្ជៈគ្មានកាហ្វេ',
  'non coffee': 'ភេសជ្ជៈគ្មានកាហ្វេ',
  'chocolate': 'សូកូឡា',
  'milk & chocolate': 'ទឹកដោះគោ និងសូកូឡា',
  'smoothie': 'ភេសជ្ជៈក្រឡុក',
  'smoothies': 'ភេសជ្ជៈក្រឡុក',
  'frappe': 'ភេសជ្ជៈក្រឡុក (Frappe)',
  'ice blended': 'ភេសជ្ជៈក្រឡុក',
  'juice': 'ទឹកផ្លែឈើ',
  'fresh juice': 'ទឹកផ្លែឈើស្រស់',
  'soda': 'សូដា',
  'italian soda': 'សូដាអ៊ីតាលី',
  'soft drinks': 'ភេសជ្ជៈកំប៉ុង',
  'soft drink': 'ភេសជ្ជៈកំប៉ុង',
  'water': 'ទឹកសុទ្ធ',
  'drinks': 'ភេសជ្ជៈ',
  'drink': 'ភេសជ្ជៈ',
  'foods': 'អាហារ',
  'food': 'អាហារ',
  'bakery': 'នំដុត',
  'bakery & pastries': 'នំដុត និងនំប៉័ង',
  'pastry': 'នំប៉័ង',
  'pastries': 'នំប៉័ង',
  'cake': 'នំខេក',
  'cakes': 'នំខេក',
  'dessert': 'បង្អែម',
  'desserts': 'បង្អែម',
  'snack': 'អាហារសម្រន់',
  'snacks': 'អាហារសម្រន់',
  'breakfast': 'អាហារពេលព្រឹក',
  'addon': 'គ្រឿងបន្ថែម',
  'add-on': 'គ្រឿងបន្ថែម',
  'add-ons': 'គ្រឿងបន្ថែម',
  'addons': 'គ្រឿងបន្ថែម',
  'add on': 'គ្រឿងបន្ថែម',
  'add ons': 'គ្រឿងបន្ថែម',
  'topping': 'គ្រឿងបន្ថែម',
  'toppings': 'គ្រឿងបន្ថែម',
  'extra': 'បន្ថែមពិសេស',
  'extras': 'បន្ថែមពិសេស',
  'other': 'ផ្សេងៗ',
  'others': 'ផ្សេងៗ'
}

export function tCategory(name) {
  if (!name) return ''
  if (locale.value !== 'km') return name
  const key = String(name).trim().toLowerCase()
  return CATEGORY_KM_MAP[key] || name
}

const TOAST_KM_MAP = {
  // Auth & Profile
  'login successful': 'ចូលប្រើប្រាស់បានជោគជ័យ',
  'logout successful': 'ចាកចេញពីប្រព័ន្ធបានជោគជ័យ',
  'signed out from all devices': 'បានចាកចេញពីគ្រប់ឧបករណ៍ទាំងអស់',
  'logged out from all devices successfully': 'បានចាកចេញពីគ្រប់ឧបករណ៍ទាំងអស់ដោយជោគជ័យ',
  'failed to sign out': 'បរាជ័យក្នុងការចាកចេញ',
  'failed to sign out of all sessions': 'បរាជ័យក្នុងការចាកចេញពីគ្រប់ឧបករណ៍',
  'profile updated successfully': 'បានកែប្រែព័ត៌មានគណនីដោយជោគជ័យ',
  'failed to update profile': 'បរាជ័យក្នុងការកែប្រែព័ត៌មានគណនី',
  'password changed successfully': 'បានប្ដូរពាក្យសម្ងាត់ដោយជោគជ័យ',
  'failed to change password': 'បរាជ័យក្នុងការប្ដូរពាក្យសម្ងាត់',
  'invalid email or password': 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ',
  'incorrect current password': 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវទេ',
  'new password must be different from current password': 'ពាក្យសម្ងាត់ថ្មីត្រូវតែខុសពីពាក្យសម្ងាត់បច្ចុប្បន្ន',
  'new password must be different from your current password': 'ពាក្យសម្ងាត់ថ្មីត្រូវតែខុសពីពាក្យសម្ងាត់បច្ចុប្បន្ន',
  'your account has been deactivated': 'គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ',
  'authentication required. no token provided.': 'សូមចូលប្រើប្រាស់ជាមុនសិន',
  'forbidden: you do not have permission to access this resource.': 'អ្នកមិនមានសិទ្ធិចូលប្រើប្រាស់ផ្នែកនេះទេ',
  'otp has been sent to your email': 'លេខកូដ OTP ត្រូវបានផ្ញើទៅកាន់អ៊ីមែលរបស់អ្នក',
  'otp verified successfully': 'ផ្ទៀងផ្ទាត់លេខកូដ OTP បានជោគជ័យ',

  // Shifts & Cash Drawer
  'shift opened successfully': 'បានបើកវេនលក់ដោយជោគជ័យ',
  'failed to open shift': 'បរាជ័យក្នុងការបើកវេនលក់',
  'shift closed successfully': 'បានបិទវេនលក់ដោយជោគជ័យ',
  'failed to close shift': 'បរាជ័យក្នុងការបិទវេនលក់',
  'failed to close shift. shift might have already been closed.': 'បរាជ័យក្នុងការបិទវេនលក់ (វេននេះអាចត្រូវបានបិទរួចហើយ)',
  'failed to load shift history': 'បរាជ័យក្នុងការទាញយកប្រវត្តិវេនលក់',
  'failed to load shift details': 'បរាជ័យក្នុងការទាញយកព័ត៌មានលម្អិតនៃវេនលក់',
  'failed to load shift summary': 'បរាជ័យក្នុងការទាញយករបាយការណ៍សង្ខេបនៃវេនលក់',
  'opening cash amounts cannot be negative.': 'ចំនួនសាច់ប្រាក់ដើមគ្រាមិនអាចតិចជាងសូន្យទេ',
  'opening cash amounts cannot be negative': 'ចំនួនសាច់ប្រាក់ដើមគ្រាមិនអាចតិចជាងសូន្យទេ',
  'please enter a valid closing usd amount': 'សូមបញ្ចូលចំនួនសាច់ប្រាក់បិទវេន (USD) អោយបានត្រឹមត្រូវ',
  'please enter a valid closing khr amount': 'សូមបញ្ចូលចំនួនសាច់ប្រាក់បិទវេន (KHR) អោយបានត្រឹមត្រូវ',
  'no active shift found': 'មិនមានវេនលក់កំពុងបើកទេ',
  'shift not found': 'រកមិនឃើញវេនលក់ទេ',
  'this shift is already closed': 'វេនលក់នេះត្រូវបានបិទរួចហើយ',
  'you already have an active open shift. please close your current shift before opening a new one.': 'អ្នកមានវេនលក់កំពុងបើករួចហើយ។ សូមបិទវេនបច្ចុប្បន្នជាមុនសិន មុននឹងបើកវេនថ្មី។',
  'you are not authorized to view this shift': 'អ្នកមិនមានសិទ្ធិមើលវេនលក់នេះទេ',
  'you are not authorized to close this shift': 'អ្នកមិនមានសិទ្ធិបិទវេនលក់នេះទេ',

  // POS, Orders, Payments & Refunds
  'failed to load pos catalog': 'បរាជ័យក្នុងការទាញយកម៉ឺនុយទំនិញ',
  'please enter a reason for the discount': 'សូមបញ្ចូលមូលហេតុនៃការបញ្ចុះតម្លៃ',
  'percentage discount cannot exceed 100%': 'ការបញ្ចុះតម្លៃជាភាគរយមិនអាចលើសពី 100% ទេ',
  'fixed discount cannot exceed subtotal': 'ទឹកប្រាក់បញ្ចុះតម្លៃមិនអាចលើសពីតម្លៃសរុបបឋមទេ',
  'failed to save order': 'បរាជ័យក្នុងការរក្សាទុកការកម្មង់',
  'received cash amount is less than the order bill': 'ប្រាក់ទទួលបានតិចជាងទឹកប្រាក់ត្រូវបង់',
  'payment failed': 'ការទូទាត់ប្រាក់បរាជ័យ',
  'payment processed successfully': 'ការទូទាត់ប្រាក់បានជោគជ័យ',
  'order created successfully': 'បានបង្កើតការកម្មង់ដោយជោគជ័យ',
  'order updated successfully': 'បានកែប្រែការកម្មង់ដោយជោគជ័យ',
  'order cancelled successfully': 'បានបោះបង់ការកម្មង់ដោយជោគជ័យ',
  'failed to load open order': 'បរាជ័យក្នុងការទាញយកការកម្មង់ដែលមិនទាន់គិតលុយ',
  'failed to load order for payment': 'បរាជ័យក្នុងការទាញយកការកម្មង់សម្រាប់ទូទាត់',
  'failed to load orders': 'បរាជ័យក្នុងការទាញយកបញ្ជីការកម្មង់',
  'failed to load payments': 'បរាជ័យក្នុងការទាញយកប្រវត្តិទូទាត់ប្រាក់',
  'failed to load refunds': 'បរាជ័យក្នុងការទាញយកប្រវត្តិសងប្រាក់វិញ',
  'failed to load order details': 'បរាជ័យក្នុងការទាញយកព័ត៌មានលម្អិតនៃការកម្មង់',
  'please enter a cancellation reason': 'សូមបញ្ចូលមូលហេតុនៃការបោះបង់ការកម្មង់',
  'failed to cancel order': 'បរាជ័យក្នុងការបោះបង់ការកម្មង់',
  'no completed payment found for this order': 'រកមិនឃើញការទូទាត់ប្រាក់សម្រាប់ការកម្មង់នេះទេ',
  'failed to find payment for refund': 'បរាជ័យក្នុងការស្វែងរកការទូទាត់សម្រាប់សងប្រាក់វិញ',
  'you must have an active open shift to process a refund.': 'អ្នកត្រូវតែបើកវេនលក់ជាមុនសិន ដើម្បីធ្វើការសងប្រាក់វិញ (Refund)',
  'you must have an active open shift to process a refund': 'អ្នកត្រូវតែបើកវេនលក់ជាមុនសិន ដើម្បីធ្វើការសងប្រាក់វិញ (Refund)',
  'you must have an active open shift to process a refund. please open a shift first.': 'អ្នកត្រូវតែបើកវេនលក់ជាមុនសិន ដើម្បីធ្វើការសងប្រាក់វិញ (Refund)',
  'you must have an active open shift to create orders. please open a shift first.': 'អ្នកត្រូវតែបើកវេនលក់ជាមុនសិន ដើម្បីបង្កើតការកម្មង់',
  'you must have an active open shift to process payments. please open a shift first.': 'អ្នកត្រូវតែបើកវេនលក់ជាមុនសិន ដើម្បីទូទាត់ប្រាក់',
  'refund reason must be at least 3 characters': 'មូលហេតុនៃការសងប្រាក់វិញត្រូវមានយ៉ាងតិច ៣ តួអក្សរ',
  'refund failed': 'បរាជ័យក្នុងការសងប្រាក់វិញ',
  'refund processed successfully': 'បានធ្វើការសងប្រាក់វិញដោយជោគជ័យ',
  'order must contain at least one item': 'ការកម្មង់ត្រូវមានទំនិញយ៉ាងហោចណាស់ ១ មុខ',
  'order not found': 'រកមិនឃើញការកម្មង់នេះទេ',
  'this order is already paid': 'ការកម្មង់នេះត្រូវបានទូទាត់ប្រាក់រួចហើយ',
  'this order is already cancelled': 'ការកម្មង់នេះត្រូវបានបោះបង់រួចហើយ',
  'paid orders cannot be cancelled directly. please process a refund instead.': 'ការកម្មង់ដែលបានគិតលុយរួចមិនអាចបោះបង់ផ្ទាល់បានទេ សូមធ្វើការសងប្រាក់វិញ (Refund)',
  'cannot update order belonging to a closed shift': 'មិនអាចកែប្រែការកម្មង់ដែលស្ថិតក្នុងវេនលក់បានបិទរួចទេ',
  'cannot cancel an order belonging to a closed shift': 'មិនអាចបោះបង់ការកម្មង់ដែលស្ថិតក្នុងវេនលក់បានបិទរួចទេ',
  'cannot process payment for an order belonging to a closed shift': 'មិនអាចទូទាត់ប្រាក់សម្រាប់ការកម្មង់ក្នុងវេនដែលបានបិទរួចទេ',
  'discounts must be approved by an authorized owner. please provide discount_approved_by': 'ការបញ្ចុះតម្លៃត្រូវតែមានការអនុម័តពីម្ចាស់ហាង (OWNER)',
  'discount reason is required when applying a discount': 'សូមបញ្ចូលមូលហេតុនៅពេលផ្ដល់ការបញ្ចុះតម្លៃ',

  // Products & Categories
  'failed to load categories': 'បរាជ័យក្នុងការទាញយកប្រភេទទំនិញ',
  'failed to load products': 'បរាជ័យក្នុងការទាញយកមុខទំនិញ',
  'category updated': 'បានកែប្រែប្រភេទទំនិញដោយជោគជ័យ',
  'category updated successfully': 'បានកែប្រែប្រភេទទំនិញដោយជោគជ័យ',
  'category created': 'បានបង្កើតប្រភេទទំនិញដោយជោគជ័យ',
  'category created successfully': 'បានបង្កើតប្រភេទទំនិញដោយជោគជ័យ',
  'category deleted': 'បានលុបប្រភេទទំនិញដោយជោគជ័យ',
  'category deleted successfully': 'បានលុបប្រភេទទំនិញដោយជោគជ័យ',
  'failed to save category': 'បរាជ័យក្នុងការរក្សាទុកប្រភេទទំនិញ',
  'category not found': 'រកមិនឃើញប្រភេទទំនិញនេះទេ',
  'category name already exists': 'ឈ្មោះប្រភេទទំនិញនេះមានរួចហើយ',
  'please create at least one category first.': 'សូមបង្កើតប្រភេទទំនិញយ៉ាងហោចណាស់ ១ ជាមុនសិន',
  'please create at least one category first': 'សូមបង្កើតប្រភេទទំនិញយ៉ាងហោចណាស់ ១ ជាមុនសិន',
  'only jpg, png, or webp images are allowed.': 'អនុញ្ញាតតែរូបភាពប្រភេទ JPG, PNG ឬ WEBP ប៉ុណ្ណោះ',
  'only jpg, png, or webp images are allowed': 'អនុញ្ញាតតែរូបភាពប្រភេទ JPG, PNG ឬ WEBP ប៉ុណ្ណោះ',
  'product image must be under 5mb.': 'ទំហំរូបភាពទំនិញត្រូវតែក្រោម 5MB',
  'product image must be under 5mb': 'ទំហំរូបភាពទំនិញត្រូវតែក្រោម 5MB',
  'a product must have at least one variant.': 'ទំនិញមួយត្រូវមានយ៉ាងហោចណាស់ ១ ជម្រើស (Variant)',
  'a product must have at least one variant': 'ទំនិញមួយត្រូវមានយ៉ាងហោចណាស់ ១ ជម្រើស (Variant)',
  'product updated': 'បានកែប្រែទំនិញដោយជោគជ័យ',
  'product updated successfully': 'បានកែប្រែទំនិញដោយជោគជ័យ',
  'product created': 'បានបង្កើតទំនិញថ្មីដោយជោគជ័យ',
  'product created successfully': 'បានបង្កើតទំនិញថ្មីដោយជោគជ័យ',
  'product deleted': 'បានលុបទំនិញដោយជោគជ័យ',
  'product deleted successfully': 'បានលុបទំនិញដោយជោគជ័យ',
  'product image uploaded successfully': 'បានបង្ហោះរូបភាពទំនិញដោយជោគជ័យ',
  'product image deleted successfully': 'បានលុបរូបភាពទំនិញដោយជោគជ័យ',
  'failed to save product': 'បរាជ័យក្នុងការរក្សាទុកទំនិញ',
  'failed to delete item': 'បរាជ័យក្នុងការលុបទិន្នន័យ',
  'product not found': 'រកមិនឃើញទំនិញនេះទេ',
  'duplicate entry: a product or variant with this name already exists': 'ឈ្មោះទំនិញ ឬជម្រើសនេះមានរួចហើយ',
  'cannot delete product because it has historical sales/order records. please deactivate the product (is_active = false) instead.': 'មិនអាចលុបទំនិញនេះបានទេ ព្រោះមានប្រវត្តិលក់រួចហើយ។ សូមបិទដំណើរការ (Inactive) ជំនួសវិញ។',
  'cannot delete or update: record is currently in use by other data': 'មិនអាចលុប ឬកែប្រែបានទេ៖ ទិន្នន័យនេះកំពុងត្រូវបានប្រើប្រាស់',
  'cannot delete the only remaining active owner in the system': 'មិនអាចលុបគណនីម្ចាស់ហាង (OWNER) តែមួយគត់ដែលនៅសល់ក្នុងប្រព័ន្ធបានទេ',
  'cannot delete this user because they have transaction history (orders, shifts, or expenses). please deactivate the user instead to preserve sales records.': 'មិនអាចលុបគណនីនេះបានទេ ព្រោះមានប្រវត្តិប្រតិបត្តិការ។ សូមផ្អាកដំណើរការគណនីជំនួសវិញ។',

  // Inventory & Stock
  'failed to load ingredients': 'បរាជ័យក្នុងការទាញយកបញ្ជីគ្រឿងផ្សំ',
  'failed to load stock movements': 'បរាជ័យក្នុងការទាញយកប្រវត្តិចលនាស្តុក',
  'ingredient name is required': 'សូមបញ្ចូលឈ្មោះគ្រឿងផ្សំ',
  'ingredient name already exists': 'ឈ្មោះគ្រឿងផ្សំនេះមានរួចហើយ',
  'ingredient not found': 'រកមិនឃើញគ្រឿងផ្សំនេះទេ',
  'ingredient created successfully': 'បានបង្កើតគ្រឿងផ្សំថ្មីដោយជោគជ័យ',
  'ingredient updated successfully': 'បានកែប្រែគ្រឿងផ្សំដោយជោគជ័យ',
  'ingredient deleted successfully': 'បានលុបគ្រឿងផ្សំដោយជោគជ័យ',
  'failed to save ingredient': 'បរាជ័យក្នុងការរក្សាទុកគ្រឿងផ្សំ',
  'cannot delete ingredient': 'មិនអាចលុបគ្រឿងផ្សំនេះបានទេ',
  'please select an ingredient': 'សូមជ្រើសរើសគ្រឿងផ្សំ',
  'quantity cannot be 0': 'បរិមាណមិនអាចស្មើ 0 បានទេ',
  'quantity must be greater than 0': 'បរិមាណត្រូវតែធំជាង 0',
  'stock movement recorded successfully': 'បានកត់ត្រាចលនាស្តុកដោយជោគជ័យ',
  'stock movement created successfully': 'បានកត់ត្រាចលនាស្តុកដោយជោគជ័យ',
  'failed to record stock movement': 'បរាជ័យក្នុងការកត់ត្រាចលនាស្តុក',

  // Recipes (BOM)
  'failed to copy recipe': 'បរាជ័យក្នុងការចម្លងរូបមន្ត',
  'failed to load recipes data': 'បរាជ័យក្នុងការទាញយកទិន្នន័យរូបមន្ត',
  'please select an ingredient for every row': 'សូមជ្រើសរើសគ្រឿងផ្សំសម្រាប់គ្រប់ជួរទាំងអស់',
  'failed to save recipe': 'បរាជ័យក្នុងការរក្សាទុករូបមន្ត',
  'failed to clear recipe': 'បរាជ័យក្នុងការសម្អាតរូបមន្ត',
  'recipe updated successfully': 'បានរក្សាទុករូបមន្តដោយជោគជ័យ',
  'recipe deleted successfully': 'បានសម្អាតរូបមន្តដោយជោគជ័យ',
  'duplicate ingredient in recipe items': 'មានគ្រឿងផ្សំជាន់គ្នាក្នុងរូបមន្ត',

  // Expenses
  'failed to load expenses': 'បរាជ័យក្នុងការទាញយកទិន្នន័យចំណាយ',
  'expense amount must be greater than 0': 'ទឹកប្រាក់ចំណាយត្រូវតែធំជាង 0',
  'amount must be greater than 0': 'ទឹកប្រាក់ត្រូវតែធំជាង 0',
  'please enter an expense description': 'សូមបញ្ចូលការពិពណ៌នាចំណាយ',
  'expense updated successfully': 'បានកែប្រែការចំណាយដោយជោគជ័យ',
  'expense recorded successfully': 'បានកត់ត្រាការចំណាយដោយជោគជ័យ',
  'expense created successfully': 'បានកត់ត្រាការចំណាយដោយជោគជ័យ',
  'expense voided successfully': 'បានបោះបង់ការចំណាយដោយជោគជ័យ',
  'failed to save expense': 'បរាជ័យក្នុងការរក្សាទុកការចំណាយ',
  'void reason must be at least 3 characters': 'មូលហេតុនៃការបោះបង់ត្រូវមានយ៉ាងតិច ៣ តួអក្សរ',
  'void reason is required and cannot be empty': 'សូមបញ្ចូលមូលហេតុនៃការបោះបង់',
  'failed to void expense': 'បរាជ័យក្នុងការបោះបង់ការចំណាយ',
  'cannot record a cash expense against a closed shift': 'មិនអាចកត់ត្រាចំណាយសាច់ប្រាក់ក្នុងវេនដែលបានបិទរួចទេ',
  'cannot update an expense that has been voided': 'មិនអាចកែប្រែការចំណាយដែលត្រូវបានបោះបង់រួចទេ',
  'you can only update expenses created by yourself': 'អ្នកអាចកែប្រែបានតែការចំណាយដែលអ្នកបានកត់ត្រាប៉ុណ្ណោះ',

  // Settings
  'settings saved successfully.': 'បានរក្សាទុកការកំណត់ដោយជោគជ័យ',
  'settings saved successfully': 'បានរក្សាទុកការកំណត់ដោយជោគជ័យ',
  'shop settings updated successfully': 'បានរក្សាទុកការកំណត់ហាងដោយជោគជ័យ',
  'failed to save settings.': 'បរាជ័យក្នុងការរក្សាទុកការកំណត់',
  'failed to save settings': 'បរាជ័យក្នុងការរក្សាទុកការកំណត់',
  'logo file size must be under 3mb.': 'ទំហំរូបសញ្ញាហាង (Logo) ត្រូវតែក្រោម 3MB',
  'logo file size must be under 3mb': 'ទំហំរូបសញ្ញាហាង (Logo) ត្រូវតែក្រោម 3MB',
  'shop logo updated.': 'បានផ្លាស់ប្ដូររូបសញ្ញាហាង (Logo) ដោយជោគជ័យ',
  'shop logo updated': 'បានផ្លាស់ប្ដូររូបសញ្ញាហាង (Logo) ដោយជោគជ័យ',
  'shop logo uploaded successfully': 'បានបង្ហោះរូបសញ្ញាហាង (Logo) ដោយជោគជ័យ',
  'failed to upload logo.': 'បរាជ័យក្នុងការបង្ហោះរូបសញ្ញាហាង',
  'failed to upload logo': 'បរាជ័យក្នុងការបង្ហោះរូបសញ្ញាហាង',
  'shop logo removed.': 'បានលុបរូបសញ្ញាហាង (Logo) ដោយជោគជ័យ',
  'shop logo removed': 'បានលុបរូបសញ្ញាហាង (Logo) ដោយជោគជ័យ',
  'shop logo deleted successfully': 'បានលុបរូបសញ្ញាហាង (Logo) ដោយជោគជ័យ',
  'failed to remove logo.': 'បរាជ័យក្នុងការលុបរូបសញ្ញាហាង',
  'failed to remove logo': 'បរាជ័យក្នុងការលុបរូបសញ្ញាហាង',

  // Users
  'failed to load users': 'បរាជ័យក្នុងការទាញយកបញ្ជីអ្នកប្រើប្រាស់',
  'user updated successfully': 'បានកែប្រែព័ត៌មានអ្នកប្រើប្រាស់ដោយជោគជ័យ',
  'user created successfully': 'បានបង្កើតគណនីអ្នកប្រើប្រាស់ដោយជោគជ័យ',
  'user deleted successfully': 'បានលុបគណនីអ្នកប្រើប្រាស់ដោយជោគជ័យ',
  'failed to save user': 'បរាជ័យក្នុងការរក្សាទុកអ្នកប្រើប្រាស់',
  'you cannot delete your own account.': 'អ្នកមិនអាចលុបគណនីផ្ទាល់ខ្លួនឯងបានទេ',
  'you cannot delete your own account': 'អ្នកមិនអាចលុបគណនីផ្ទាល់ខ្លួនឯងបានទេ',
  'you cannot deactivate your own account': 'អ្នកមិនអាចផ្អាកគណនីផ្ទាល់ខ្លួនឯងបានទេ',
  'email is already registered': 'អ៊ីមែលនេះត្រូវបានចុះឈ្មោះរួចហើយ',
  'email is already registered by another user': 'អ៊ីមែលនេះត្រូវបានប្រើប្រាស់ដោយគណនីផ្សេងរួចហើយ',
  'failed to delete user': 'បរាជ័យក្នុងការលុបអ្នកប្រើប្រាស់',

  // Dashboard, Reports & Audit Logs
  'failed to load dashboard metrics': 'បរាជ័យក្នុងការទាញយកទិន្នន័យផ្ទាំងគ្រប់គ្រង',
  'failed to load report data': 'បរាជ័យក្នុងការទាញយកទិន្នន័យរបាយការណ៍',
  'failed to load audit logs': 'បរាជ័យក្នុងការទាញយកកំណត់ត្រាសកម្មភាព',
  'audit json payload copied to clipboard': 'បានចម្លងទិន្នន័យ JSON ទុកក្នុង Clipboard',
  'unable to copy json payload': 'មិនអាចចម្លងទិន្នន័យ JSON បានទេ'
}

const TOAST_KM_PATTERNS = [
  [/^Expense #(\d+) voided$/i, (_, id) => `បានបោះបង់ការចំណាយលេខ #${id}`],
  [/^Ingredient ['"](.+)['"] updated$/i, (_, name) => `បានកែប្រែគ្រឿងផ្សំ '${name}' ដោយជោគជ័យ`],
  [/^Ingredient ['"](.+)['"] created$/i, (_, name) => `បានបង្កើតគ្រឿងផ្សំ '${name}' ដោយជោគជ័យ`],
  [/^Ingredient ['"](.+)['"] deleted$/i, (_, name) => `បានលុបគ្រឿងផ្សំ '${name}' ដោយជោគជ័យ`],
  [/^Reason is required for (.+) movements$/i, (_, type) => `សូមបញ្ចូលមូលហេតុសម្រាប់ចលនាស្តុក (${type})`],
  [/^Order (.+) cancelled$/i, (_, no) => `បានបោះបង់ការកម្មង់ ${no}`],
  [/^Order (.+) updated$/i, (_, no) => `បានកែប្រែការកម្មង់ ${no}`],
  [/^Order #(\d+) \((.+)\) saved as Open$/i, (_, q, no) => `បានរក្សាទុកការកម្មង់ #${q} (${no}) ទុកគិតលុយពេលក្រោយ`],
  [/^Payment completed for (.+)$/i, (_, no) => `បានទូទាត់ប្រាក់រួចរាល់សម្រាប់ ${no}`],
  [/^Order (.+) is already (.+)$/i, (_, no, st) => `ការកម្មង់ ${no} ស្ថិតក្នុងស្ថានភាព ${st} រួចហើយ`],
  [/^Loaded Order #(\d+) \((.+)\)$/i, (_, q, no) => `បានទាញយកការកម្មង់ #${q} (${no})`],
  [/^Refund processed for (.+)$/i, (_, no) => `បានធ្វើការសងប្រាក់វិញសម្រាប់ ${no}`],
  [/^Copied recipe from (.+) to (.+)$/i, (_, a, b) => `បានចម្លងរូបមន្តពី ${a} ទៅ ${b}`],
  [/^Copied recipe from (.+)$/i, (_, a) => `បានចម្លងរូបមន្តពី ${a}`],
  [/^Recipe saved for (.+)$/i, (_, v) => `បានរក្សាទុករូបមន្តសម្រាប់ ${v}`],
  [/^Recipe cleared for (.+)$/i, (_, v) => `បានសម្អាតរូបមន្តសម្រាប់ ${v}`],
  [/^Cannot close shift: There are (\d+) unpaid order\(s\)\. Please pay or cancel them first\.?$/i, (_, n) => `មិនអាចបិទវេនលក់បានទេ៖ មានការកម្មង់ចំនួន ${n} ដែលមិនទាន់គិតលុយ។ សូមទូទាត់ ឬបោះបង់ជាមុនសិន។`],
  [/^Cannot delete category ['"](.+)['"] because it has (\d+) product\(s\)/i, (_, name, n) => `មិនអាចលុបប្រភេទ '${name}' បានទេ ព្រោះមានទំនិញចំនួន ${n} កំពុងប្រើប្រាស់`],
  [/^Cannot delete category because it has (\d+) assigned product\(s\)/i, (_, n) => `មិនអាចលុបប្រភេទទំនិញនេះបានទេ ព្រោះមានទំនិញចំនួន ${n} កំពុងប្រើប្រាស់។ សូមផ្លាស់ប្ដូរ ឬលុបទំនិញជាមុនសិន។`],
  [/^Cannot delete category ['"](.+)['"] because it is referenced by existing products/i, (_, name) => `មិនអាចលុបប្រភេទ '${name}' បានទេ ព្រោះកំពុងមានទំនិញប្រើប្រាស់`],
  [/^Cannot delete product ['"](.+)['"] because it is referenced by existing order or stock records/i, (_, name) => `មិនអាចលុបទំនិញ '${name}' បានទេ ព្រោះមានប្រវត្តិការកម្មង់ ឬស្តុកពាក់ព័ន្ធ`],
  [/^Cannot delete ingredient ['"](.+)['"] because it is used in (\d+) recipe/i, (_, name, n) => `មិនអាចលុបគ្រឿងផ្សំ '${name}' បានទេ ព្រោះកំពុងប្រើក្នុងរូបមន្តចំនួន ${n}`],
  [/^Cannot delete ingredient ['"](.+)['"] because it has existing stock movement history/i, (_, name) => `មិនអាចលុបគ្រឿងផ្សំ '${name}' បានទេ ព្រោះមានប្រវត្តិចលនាស្តុករួចហើយ។ សូមបិទដំណើរការ (Inactive) ជំនួសវិញ។`],
  [/^Cannot change unit of ingredient ['"](.+)['"] from (.+) to (.+) because it is used in (\d+) recipe/i, (_, name, u1, u2, n) => `មិនអាចប្ដូរខ្នាតគ្រឿងផ្សំ '${name}' ពី ${u1} ទៅ ${u2} បានទេ ព្រោះកំពុងប្រើក្នុងរូបមន្តចំនួន ${n}`],
  [/^Cannot delete ingredient ['"](.+)['"] because it is referenced by other records\.?$/i, (_, name) => `មិនអាចលុបគ្រឿងផ្សំ '${name}' បានទេ ព្រោះមានទិន្នន័យពាក់ព័ន្ធ`],
  [/^Insufficient stock for ingredient ['"](.+)['"]/i, (_, name) => `ស្តុកគ្រឿងផ្សំ '${name}' មិនគ្រប់គ្រាន់ទេ`],
  [/^Product ['"](.+)['"] already exists in this category$/i, (_, name) => `ទំនិញ '${name}' មាននៅក្នុងប្រភេទនេះរួចហើយ`],
  [/^Duplicate variant name ['"](.+)['"] in the same product$/i, (_, name) => `ឈ្មោះជម្រើស '${name}' ជាន់គ្នាក្នុងទំនិញតែមួយ`]
]

export function tToast(message) {
  if (!message) return ''
  if (locale.value !== 'km') return message
  const str = String(message).trim()
  const lower = str.toLowerCase()
  if (TOAST_KM_MAP[lower]) {
    return TOAST_KM_MAP[lower]
  }
  for (const [regex, replacer] of TOAST_KM_PATTERNS) {
    const match = str.match(regex)
    if (match) {
      return replacer(...match)
    }
  }
  return str
}

export function setLocale(lang) {
  if (!messages[lang]) return
  locale.value = lang
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, lang)
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  } catch (e) {
    console.warn('Could not persist locale:', e)
  }
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
    tCategory,
    tToast,
    setLocale,
    toggleLocale
  }
}

export default {
  install(app) {
    app.config.globalProperties.$t = t
    app.config.globalProperties.$tCategory = tCategory
    app.config.globalProperties.$tToast = tToast
    app.config.globalProperties.$locale = locale
    app.config.globalProperties.$setLocale = setLocale
    app.config.globalProperties.$toggleLocale = toggleLocale
  }
}
