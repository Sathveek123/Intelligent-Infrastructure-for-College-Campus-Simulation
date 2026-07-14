export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validateRequired(value: string) {
  return value.trim().length > 0
}

export function validateNumber(value: string, min?: number, max?: number) {
  const n = Number(value)
  if (Number.isNaN(n)) return false
  if (min !== undefined && n < min) return false
  if (max !== undefined && n > max) return false
  return true
}

export function validateYear(year: number) {
  return year >= 1900 && year <= 2030
}
