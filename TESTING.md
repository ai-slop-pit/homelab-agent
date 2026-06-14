# Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

This will install Jest and other dev dependencies.

### 2. Run All Tests
```bash
npm test
```

This runs all test files with coverage reporting.

### 3. Watch Mode (Recommended for Development)
```bash
npx jest --watch
```

Re-runs tests automatically when files change.

## Test Organization

### Database Tests
- **File**: `lib/test/db.test.js`
- **Coverage**: Transactions, migrations, constraints, indexes, metrics
- **Run**: `npm test -- lib/test/db.test.js`

### Rate Limiter Tests
- **File**: `lib/test/rate-limiter.test.js`
- **Coverage**: Token bucket, queue management, backoff, per-chat limits
- **Run**: `npm test -- lib/test/rate-limiter.test.js`

### Worker Polling Tests
- **File**: `worker/test/worker-poll.test.js`
- **Coverage**: Task selection, backoff calculation, metrics, recovery
- **Run**: `npm test -- worker/test/worker-poll.test.js`

### Bot Handler Tests
- **File**: `channels/telegram/test/bot-handlers.test.js`
- **Coverage**: Commands, approval/rejection, text handling, session management
- **Run**: `npm test -- channels/telegram/test/bot-handlers.test.js`

### Input Validation Tests
- **File**: `lib/test/task-api.test.js` (existing)
- **Coverage**: Title/description validation, sanitization, length limits
- **Run**: `npm test -- lib/test/task-api.test.js`

## Test Examples

### Run tests matching a pattern
```bash
npx jest --testNamePattern="Rate Limiter"
npx jest --testNamePattern="Database"
npx jest --testNamePattern="backoff"
```

### Run with verbose output
```bash
npx jest --verbose
```

### Run single test file
```bash
npx jest lib/test/db.test.js
```

### Update snapshots (if using snapshots)
```bash
npx jest --updateSnapshot
```

### Debug mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

## Coverage Report

After running tests, check coverage:

```bash
npm test
```

You'll see output like:
```
 PASS  lib/test/db.test.js
 PASS  lib/test/rate-limiter.test.js
 PASS  worker/test/worker-poll.test.js
 PASS  channels/telegram/test/bot-handlers.test.js

Test Suites: 4 passed, 4 total
Tests:       93 passed, 93 total
Coverage Summary:
- Statements: 65% (target: 50%)
- Branches: 62% (target: 50%)
- Functions: 70% (target: 50%)
- Lines: 65% (target: 50%)
```

For detailed HTML coverage report:
```bash
open coverage/index.html
```

## Troubleshooting

### npm install fails
```bash
npm install --verbose
# Check Node.js version: node --version (should be 14+)
# Check npm version: npm --version
```

### Tests fail with "Cannot find module"
- Verify test imports match actual file paths
- Check that all dependencies are installed
- Restart npm: `npm install`

### Timeout errors
- Tests have 10-second timeout by default
- Increase if needed in `jest.config.js`
- Check for infinite loops or blocking operations

### Database locked errors
- Ensure cleanup happens after each test
- Check that previous test databases are deleted
- Look for `beforeEach`/`afterEach` cleanup

## Writing New Tests

### Test File Template
```javascript
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const TEST_DB_PATH = path.join(__dirname, 'test.db')

beforeEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
})

afterEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
})

describe('Module - Feature', () => {
  it('should do something', () => {
    // Arrange
    const db = createTestDb()
    
    // Act
    const result = db.prepare(...).run(...)
    
    // Assert
    expect(result).toBe(expected)
    db.close()
  })
})
```

### Jest Matchers
```javascript
expect(value).toBe(expected)           // Strict equality
expect(value).toEqual(expected)        // Deep equality
expect(value).toContain(item)          // Array contains
expect(value).toBeDefined()            // Not undefined
expect(value).toBeNull()               // Is null
expect(value).toThrow()                // Function throws
expect(async fn).rejects.toThrow()    // Async rejection
expect(value).toBeGreaterThan(5)      // Number comparison
expect(value).toHaveLength(10)        // String/array length
expect(value).toMatch(/regex/)        // String matching
```

## CI/CD Integration

To run tests in CI/CD:

```bash
npm ci          # Clean install (use package-lock.json)
npm test        # Run all tests with coverage
# Optional: Upload coverage to service
# npx codecov
```

## Performance

Current test statistics:
- Total tests: 93
- Average runtime: ~2 seconds
- Slowest suite: rate-limiter tests (mock timers)
- Fastest suite: bot-handlers tests

To profile:
```bash
npx jest --logHeapUsage
npx jest --detectOpenHandles
```

## Next Steps

1. ✅ Run `npm install` to install Jest
2. ✅ Run `npm test` to verify all tests pass
3. ✅ Review coverage report for gaps
4. ✅ Add new tests as features are added
5. ✅ Keep coverage above 60% for core modules

See `TEST_COVERAGE.md` for detailed test documentation.
