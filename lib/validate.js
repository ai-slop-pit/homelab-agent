// Input validation for task data to prevent corruption and injection

function maxLength(str, max) {
  if (typeof str !== 'string') return ''
  return str.substring(0, max).trim()
}

function sanitizeText(str) {
  if (typeof str !== 'string') return ''
  // Remove null bytes and other control chars, but keep newlines and basic whitespace
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

function validateTaskInput(text) {
  if (typeof text !== 'string') return ''
  // Combine: remove control chars, enforce max length
  const sanitized = sanitizeText(text)
  return maxLength(sanitized, 2000)
}

function validateTitle(text) {
  // Title: max 100 chars, single line
  if (typeof text !== 'string') return ''
  const sanitized = sanitizeText(text)
  const singleLine = sanitized.split('\n')[0]
  return maxLength(singleLine, 100)
}

function validateDescription(text) {
  // Description: max 2000 chars, allow newlines
  return validateTaskInput(text)
}

function validateRejectionNotes(text) {
  // Same as description
  return validateTaskInput(text)
}

function validateSource(text) {
  // Source: max 100 chars, single line
  if (typeof text !== 'string') return ''
  const sanitized = sanitizeText(text)
  const singleLine = sanitized.split('\n')[0]
  return maxLength(singleLine, 100)
}

module.exports = {
  maxLength,
  sanitizeText,
  validateTaskInput,
  validateTitle,
  validateDescription,
  validateRejectionNotes,
  validateSource,
}
