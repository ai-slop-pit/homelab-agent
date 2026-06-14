# Test Coverage Summary

This document describes the test suite for the Claude Home Agent project.

## Test Structure

Tests are organized by module in the following directory structure:

```
/opt/claude-agent/
├── lib/test/
│   ├── db.test.js           (Database tests)
│   ├── rate-limiter.test.js (Rate limiting tests)
│   └── task-api.test.js     (Input validation tests - existing)
├── worker/test/
│   └── worker-poll.test.js  (Worker polling tests)
└── channels/telegram/test/
    └── bot-handlers.test.js (Telegram bot handler tests)
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests with Coverage
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- lib/test/db.test.js
npm test -- worker/test/worker-poll.test.js
```

### Run Tests in Watch Mode
```bash
npx jest --watch
```

## Test Coverage Goals

Target: **60%+ coverage** for core paths

## Test Suites

### 1. Database Tests (`lib/test/db.test.js`)
**Purpose**: Verify database operations, migrations, transactions, and constraints

**Test Groups**:
- **Transactions** (3 tests)
  - Execute transaction successfully
  - Rollback transaction on error
  - Handle nested transaction contexts

- **Schema Creation** (2 tests)
  - Create tasks table with correct columns
  - Verify correct column types

- **Migrations** (3 tests)
  - Handle duplicate column migration gracefully
  - Apply multiple migrations in sequence

- **Constraints** (4 tests)
  - Enforce NOT NULL constraints
  - Enforce CHECK constraints on valid statuses
  - Backfill NULL values with defaults
  - Normalize invalid status values

- **Indexes** (2 tests)
  - Create indexes for common queries
  - Use composite index for type+status queries

- **Metrics Table** (2 tests)
  - Create metrics table
  - Handle metric insertion and update

**Total**: 16 tests

### 2. Rate Limiter Tests (`lib/test/rate-limiter.test.js`)
**Purpose**: Verify token bucket algorithm, rate limiting, and backoff strategies

**Test Groups**:
- **Basic Operations** (6 tests)
  - Initialize with correct burst size
  - Initialize with custom parameters
  - Consume a token when available
  - Reject consumption when unavailable
  - Refill tokens over time
  - Cap at burst size when refilling

- **Wait Time Calculation** (3 tests)
  - Return 0 wait time when tokens available
  - Calculate wait time when unavailable
  - Calculate wait time for multiple tokens

- **Per-Chat Limiters** (6 tests)
  - Create new limiter for new chat
  - Return same limiter for same chat
  - Create separate limiters for different chats
  - Update lastUsedTime on access
  - Enforce per-chat limits independently

- **Queue Management** (4 tests)
  - Queue functions for rate-limited execution
  - Execute queued functions in order
  - Handle function errors
  - Reject on synchronous throws

- **Global and Per-Chat Limits** (3 tests)
  - Respect global rate limit
  - Enforce per-chat rate limits
  - Allow different chats independent limits

- **Backoff Strategy** (3 tests)
  - Implement backoff for 429 responses
  - Not call function during backoff
  - Resume processing after backoff expires

- **Cleanup** (2 tests)
  - Remove old unused chat limiters
  - Not remove recently used chat limiters

- **Throttled Logging** (1 test)
  - Log at most once per interval

**Total**: 28 tests

### 3. Worker Poll Tests (`worker/test/worker-poll.test.js`)
**Purpose**: Verify task polling logic, backoff calculation, and metrics tracking

**Test Groups**:
- **Task Selection** (8 tests)
  - Select work task in backlog status
  - Select chat task in inbox status
  - Select task with highest priority first
  - Select earliest task with equal priority
  - Select approved work task for implementation
  - Select improvement task in approved status
  - Return null when no tasks available
  - Prioritize work tasks over chat tasks

- **Stuck Task Recovery** (2 tests)
  - Recover stuck planning tasks
  - Not recover recently stuck tasks

- **Metrics Tracking** (4 tests)
  - Increment poll count metric
  - Increment tasks_found_count when task selected
  - Track total plan time
  - Track completed and failed tasks

- **Backoff Calculation** (5 tests)
  - Start with 10s interval
  - Increase to 30s at 5 consecutive empty
  - Increase to 60s at 10 consecutive empty
  - Stay at 60s for higher empty counts
  - Use proper thresholds

- **Queue Length** (3 tests)
  - Count inbox tasks
  - Count all pending statuses
  - Not count done or failed tasks

- **Index Efficiency** (1 test)
  - Use type_status index for common queries

**Total**: 23 tests

### 4. Bot Handlers Tests (`channels/telegram/test/bot-handlers.test.js`)
**Purpose**: Verify Telegram bot command handlers and message processing

**Test Groups**:
- **Work Command Handler** (4 tests)
  - Create work task from command
  - Sanitize work task description
  - Enforce max length for work task
  - Truncate work task title to 100 chars

- **Approve Handler** (4 tests)
  - Update task status to approved
  - Not update if task not in awaiting_approval status
  - Handle approve action for non-existent task
  - Update timestamp on approval

- **Reject Handler** (3 tests)
  - Update task status to needs_revision
  - Sanitize rejection notes
  - Enforce max length for rejection notes

- **Text Handler** (7 tests)
  - Create chat task from text message
  - Store thinking message id
  - Handle reply to previous message with session
  - Not use session if reply to non-existent message
  - Sanitize text message
  - Enforce max length for text message

- **Rejection Workflow** (3 tests)
  - Track pending rejection per chat
  - Handle rejection notes for pending task
  - Ignore text if no pending rejection

- **Task Listing** (3 tests)
  - List recent tasks
  - Handle empty task list
  - Truncate labels to 50 chars

- **Multi-Chat Handling** (2 tests)
  - Isolate tasks by chat_id
  - Track pending rejections per chat independently

**Total**: 26 tests

## Code Coverage Analysis

### Core Paths Covered

**Database Module (lib/db.js)**
- ✓ Database initialization
- ✓ Table creation
- ✓ Migration execution and error handling
- ✓ Constraint application
- ✓ Transaction execution and rollback

**Rate Limiter Module (lib/rateLimit.js)**
- ✓ Token bucket initialization
- ✓ Token consumption
- ✓ Token refill logic
- ✓ Global rate limiting
- ✓ Per-chat rate limiting
- ✓ Queue management
- ✓ Backoff strategy for 429 responses
- ✓ Cleanup of old limiters

**Worker Module (worker/worker.js)**
- ✓ Task polling and selection
- ✓ Priority sorting
- ✓ Backoff calculation
- ✓ Metric tracking
- ✓ Stuck task recovery
- ✓ Queue length calculation
- ✓ Index usage for queries

**Bot Handlers (channels/telegram/bot.js)**
- ✓ Work command processing
- ✓ Text message handling
- ✓ Approval workflow
- ✓ Rejection workflow
- ✓ Session continuation
- ✓ Input validation and sanitization
- ✓ Message length enforcement
- ✓ Multi-chat isolation

## Excluded from Tests

The following are tested via integration tests or not directly testable:
- Telegram API calls (mocked in theory, not in these unit tests)
- HTTP requests to health endpoint
- Actual Claude CLI execution
- Git operations
- File system operations (except database)
- Process signals and event handling

## Test Statistics

| Module | Tests | Coverage Goal |
|--------|-------|---------------|
| lib/db.js | 16 | 70%+ |
| lib/rateLimit.js | 28 | 75%+ |
| worker/worker.js (poll functions) | 23 | 65%+ |
| channels/telegram/bot.js (handlers) | 26 | 70%+ |
| **Total** | **93** | **60%+** |

## Running Coverage Report

After running tests, a coverage report is generated:

```bash
npm test
# Coverage summary will be printed to console
# Detailed HTML report available in coverage/
```

## Test Configuration

Configuration file: `jest.config.js`

Key settings:
- **testEnvironment**: node (for server-side code)
- **testMatch**: **/*.test.js (matches all test files)
- **timeout**: 10000ms per test
- **coverage threshold**: 50% minimum for all metrics

## Best Practices

1. **Test Isolation**: Each test uses a fresh database file
2. **Cleanup**: beforeEach/afterEach remove test databases
3. **Mocking**: Jest's built-in functions for mocking
4. **Async Testing**: Proper use of async/await and jest.useFakeTimers()
5. **Real Database**: Tests use real SQLite for integration-like testing
6. **Edge Cases**: Input validation, boundary conditions, error paths

## Next Steps

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Review coverage report for gaps
4. Add integration tests for:
   - Telegram API interactions
   - Claude runner integration
   - Git operations
   - Full worker polling cycle
