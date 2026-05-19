import { toast } from 'react-hot-toast'

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Filters phone input to allow only valid characters and enforce max length
 * - Allows digits (0-9) and plus sign (+)
 * - Enforces max length based on format:
 *   - Starting with 0: max 10 digits
 *   - Starting with +233: max 12 chars (+ + 233 + 9 digits)
 *   - Starting with +: max 15 chars (flexible country codes)
 */
export function filterPhoneInput(value: string): string {
  // Remove any non-digit and non-plus characters
  let cleaned = value.replace(/[^\d+]/g, '')

  // Only one plus sign allowed, and must be at the start
  if (cleaned.includes('+')) {
    const plusIndex = cleaned.indexOf('+')
    if (plusIndex !== 0) {
      // Remove plus if it's not at the start
      cleaned = cleaned.replace(/\+/g, '')
    } else if (cleaned.lastIndexOf('+') !== 0) {
      // Remove additional plus signs
      cleaned = cleaned.slice(0, 1) + cleaned.slice(1).replace(/\+/g, '')
    }
  }

  // Enforce max length based on format
  if (cleaned.startsWith('+233')) {
    // Ghana number: +233 + 9 digits = 12 chars max
    cleaned = cleaned.slice(0, 12)
  } else if (cleaned.startsWith('+')) {
    // Other country codes: allow up to 15 chars
    cleaned = cleaned.slice(0, 15)
  } else if (cleaned.startsWith('0')) {
    // Local format: 0 + 9 digits = 10 chars max
    cleaned = cleaned.slice(0, 10)
  } else if (cleaned.length > 0) {
    // Doesn't start with 0 or +, limit to 15 digits
    cleaned = cleaned.slice(0, 15)
  }

  return cleaned
}

/**
 * Filters email input to allow RFC 5321/5322 valid characters in local-part
 * - Allows: letters, numbers, and special chars: ! # $ % & ' * + - / = ? ^ _ ` { | } ~ .
 * - Also allows @ for domain separator
 * Note: The + character is valid in email local-parts (e.g., user+tag@domain.com)
 */
export function filterEmailInput(value: string): string {
  // Allow RFC 5321/5322 valid characters: alphanumeric, @, and special chars: ! # $ % & ' * + - / = ? ^ _ ` { | } ~ .
  return value.replace(/[^\w@.!#$%&'*+/=?^`{|}~\-]/g, '')
}

/**
 * Phone validation rules:
 * - If starts with 0: exactly 10 digits
 * - If starts with +233: exactly 12 digits (+ excluded in total)
 * - If starts with +: allow any digits (minimum 5 for safety)
 */
function validatePhone(phone: string): string | null {
  const trimmedPhone = phone.trim()
  if (!trimmedPhone) return null

  const cleanPhone = trimmedPhone.replace(/\s+/g, '')

  if (cleanPhone.startsWith('+233')) {
    // Ghana number: +233 followed by 9 more digits (12 total)
    if (!/^\+233\d{9}$/.test(cleanPhone)) {
      return 'Ghana number (+233) must have exactly 9 digits after +233'
    }
  } else if (cleanPhone.startsWith('+')) {
    // Other country codes: allow flexible digits but minimum 5
    if (!/^\+\d{5,}$/.test(cleanPhone)) {
      return 'Country code (+) must be followed by at least 5 digits'
    }
  } else if (cleanPhone.startsWith('0')) {
    // Local Ghana format: 0 followed by exactly 9 digits (10 total)
    if (!/^0\d{9}$/.test(cleanPhone)) {
      return 'Local number (starting with 0) must have exactly 10 digits'
    }
  } else {
    // No country code or leading 0
    return 'Phone must start with 0, +, or a country code'
  }

  return null
}

/**
 * Email validation: must contain @ and . with valid format
 */
function validateEmail(email: string): string | null {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) return null

  // Basic email validation: user@domain.extension
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return 'Email must be in format: user@domain.extension'
  }

  return null
}

/**
 * Validates contact form inputs according to business rules
 * - Name is required
 * - At least one of phone or email is required
 * - Phone and email must follow specific formats
 */
export function validateContactForm(
  name: string,
  phone: string,
  email: string
): ValidationResult {
  const errors: Record<string, string> = {}

  if (!name.trim()) {
    errors.name = 'Name is required'
  }

  // At least one of phone or email is required
  const phoneEmpty = !phone.trim()
  const emailEmpty = !email.trim()

  if (phoneEmpty && emailEmpty) {
    errors.contact = 'Please provide either a phone number or email address'
  }

  if (!phoneEmpty) {
    const phoneError = validatePhone(phone)
    if (phoneError) {
      errors.phone = phoneError
    }
  }

  if (!emailEmpty) {
    const emailError = validateEmail(email)
    if (emailError) {
      errors.email = emailError
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export type ToastType = 'error' | 'success' | 'info' | 'warning'

export interface ToastMessage {
  type: ToastType
  title: string
  description?: string
}

export function showFeedback(message: ToastMessage): void {
  const content = message.description
    ? `${message.title} — ${message.description}`
    : message.title

  switch (message.type) {
    case 'error':
      toast.error(content)
      break

    case 'success':
      toast.success(content)
      break

    case 'info':
      toast(content, { icon: 'ℹ️' })
      break

    case 'warning':
      toast(content, { icon: '⚠️' })
      break
  }
}

/**
 * Shows validation errors to user
 */
export function showValidationErrors(errors: Record<string, string>): void {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(' • ')

  showFeedback({
    type: 'error',
    title: 'Validation Error',
    description: errorMessages
  })
}
