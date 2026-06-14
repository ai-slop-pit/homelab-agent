// Tests for task-api.js input validation
const assert = require('assert')
const {
  validateTitle,
  validateDescription,
  validateTaskInput,
  sanitizeText,
} = require('../validate')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log('✓ ' + name)
    passed++
  } catch (e) {
    console.log('✗ ' + name)
    console.log('  ' + e.message)
    failed++
  }
}

// validateTitle tests
test('validateTitle: accept valid title', () => {
  const result = validateTitle('Create new feature')
  assert.strictEqual(result, 'Create new feature')
})

test('validateTitle: reject empty string', () => {
  const result = validateTitle('')
  assert.strictEqual(result, '')
})

test('validateTitle: reject non-string input', () => {
  assert.strictEqual(validateTitle(null), '')
  assert.strictEqual(validateTitle(undefined), '')
  assert.strictEqual(validateTitle(123), '')
})

test('validateTitle: enforce max length (100 chars)', () => {
  const long = 'x'.repeat(150)
  const result = validateTitle(long)
  assert(result.length <= 100, `Expected max 100 chars, got ${result.length}`)
})

test('validateTitle: remove control characters', () => {
  const input = 'Title with\x00null\x01and\x1Fcontrol'
  const result = validateTitle(input)
  assert(!result.includes('\x00'), 'Null byte should be removed')
  assert(!result.includes('\x01'), 'Control char should be removed')
})

test('validateTitle: strip to first line only', () => {
  const input = 'First line\nSecond line'
  const result = validateTitle(input)
  assert.strictEqual(result, 'First line')
})

test('validateTitle: handle whitespace correctly', () => {
  const result = validateTitle('  title with spaces  ')
  assert.strictEqual(result, 'title with spaces')
})

// validateDescription tests
test('validateDescription: accept valid description', () => {
  const input = 'Detailed description\nwith multiple\nlines'
  const result = validateDescription(input)
  assert.strictEqual(result, input)
})

test('validateDescription: reject empty string', () => {
  const result = validateDescription('')
  assert.strictEqual(result, '')
})

test('validateDescription: reject non-string input', () => {
  assert.strictEqual(validateDescription(null), '')
  assert.strictEqual(validateDescription(undefined), '')
})

test('validateDescription: enforce max length (2000 chars)', () => {
  const long = 'x'.repeat(3000)
  const result = validateDescription(long)
  assert(result.length <= 2000, `Expected max 2000 chars, got ${result.length}`)
})

test('validateDescription: preserve newlines', () => {
  const input = 'Line 1\nLine 2\nLine 3'
  const result = validateDescription(input)
  assert(result.includes('\n'), 'Newlines should be preserved')
  assert.strictEqual(result.split('\n').length, 3)
})

test('validateDescription: remove control characters', () => {
  const input = 'Text with\x00null\x1Fcontrol\nchars'
  const result = validateDescription(input)
  assert(!result.includes('\x00'), 'Null byte should be removed')
  assert(result.includes('\n'), 'Newlines should be preserved')
})

// validateTaskInput tests
test('validateTaskInput: accept valid input', () => {
  const input = 'Progress update\nwith multiple lines'
  const result = validateTaskInput(input)
  assert.strictEqual(result, input)
})

test('validateTaskInput: reject empty string', () => {
  const result = validateTaskInput('')
  assert.strictEqual(result, '')
})

test('validateTaskInput: enforce max length (2000 chars)', () => {
  const long = 'x'.repeat(3000)
  const result = validateTaskInput(long)
  assert(result.length <= 2000)
})

test('validateTaskInput: remove control characters', () => {
  const input = 'Message with\x00null\x1Fbytes'
  const result = validateTaskInput(input)
  assert(!result.includes('\x00'))
  assert(!result.includes('\x1F'))
})

// sanitizeText tests
test('sanitizeText: remove null bytes', () => {
  const input = 'Text\x00with\x00nulls'
  const result = sanitizeText(input)
  assert.strictEqual(result, 'Textwithnulls')
  assert(!result.includes('\x00'), 'Null bytes should be removed')
})

test('sanitizeText: remove control characters', () => {
  const input = 'Text\x01\x02\x03\x1F\x7F'
  const result = sanitizeText(input)
  assert.strictEqual(result, 'Text')
})

test('sanitizeText: preserve newlines', () => {
  const input = 'Line 1\nLine 2'
  const result = sanitizeText(input)
  assert.strictEqual(result, input)
})

test('sanitizeText: preserve spaces and tabs', () => {
  const input = 'Text with  spaces\tand\ttabs'
  const result = sanitizeText(input)
  assert.strictEqual(result, input)
})

test('sanitizeText: reject non-string input', () => {
  assert.strictEqual(sanitizeText(null), '')
  assert.strictEqual(sanitizeText(undefined), '')
  assert.strictEqual(sanitizeText(123), '')
})

// SQL injection prevention tests
test('SQL injection: prevent SQL injection via title', () => {
  const malicious = "'; DROP TABLE tasks; --"
  const result = validateTitle(malicious)
  // Should be treated as plain text, not executed
  assert.strictEqual(result, malicious)
})

test('SQL injection: prevent null bytes in input', () => {
  const malicious = "value\x00; DROP TABLE tasks;"
  const result = validateTitle(malicious)
  assert(!result.includes('\x00'))
})

// Edge cases
test('Edge case: handle very long unicode strings', () => {
  const unicode = '你好世界'.repeat(50)
  const result = validateTitle(unicode)
  assert(result.length <= 100)
})

test('Edge case: handle mixed valid and invalid chars', () => {
  const mixed = 'Valid\x00\x1Ftext\nhere'
  const result = validateDescription(mixed)
  assert.strictEqual(result, 'Validtext\nhere')
})

// Print summary
console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed')
if (failed > 0) {
  process.exit(1)
}
