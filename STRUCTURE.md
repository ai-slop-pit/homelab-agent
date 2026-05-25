# Agent Structure

Clean, organized codebase for the unified home agent.

## Directory Map

```
src/                      Core application logic
├── core/                 Agent brain (manager, learner, proposer)
│   ├── manager.js        Orchestrates agent tasks
│   ├── learner.js        Learning engine, pattern discovery
│   ├── proposer.js       Proposes new skills, automations
│   └── proposal-batcher.js  Batches proposals for efficiency
├── handlers/             Event & request handlers
│   ├── approval-handler.js  Manages approval workflows
│   └── notifier.js          Sends notifications
├── telegram/             Telegram bot integration
│   ├── bot.js            Main Telegram bot
│   ├── batch-handler.js  Processes batch messages
│   └── notifier.js       Sends Telegram messages
├── utils/                Utilities & helpers
│   ├── performance-tracker.js  Tracks skill/agent performance
│   ├── request-approval.js     CLI tool for approvals
│   ├── topic-manager.js        Manages Telegram topics
│   └── fact-extractor.js       Extracts facts from text
└── skills/               Skill utilities
    └── skill-creator.js  Creates skills from proposals

bin/                      Executable entry points
├── start-agent.sh        Start main agent
├── start-bot.sh          Start Telegram bot
└── restart-bot.sh        Restart Telegram bot

scripts/                  Scripts & utilities (non-core)
├── test/                 Test scripts
│   ├── test-*.js
│   └── integration-test.js
├── debug/                Debug utilities
│   └── debate-engine.js
└── setup/                Setup scripts
    ├── create-topic.js
    ├── delete-topic.js
    └── topic-manager.js

.claude/
├── skills/               Skill definitions (deployed, versioned)
├── setup-artifacts/      Configuration from setup tasks
└── utils/                Helper scripts & tools

index.js                  Unified CLI entry point
```

## Usage

### Start the Telegram Bot
```bash
./bin/start-bot.sh
# or
node index.js bot
```

### Run Agent Manager
```bash
node index.js manager
```

### Run Learning Engine
```bash
node index.js learner
```

### Request Approval (CLI)
```bash
node src/utils/request-approval.js "action-name" "Description" ["item1", "item2"]
```

## Import Patterns

All imports use relative paths from each module's location:

**From `src/telegram/bot.js`:**
```js
const { ApprovalHandler } = require('../handlers/approval-handler');
const { SkillCreator } = require('../skills/skill-creator');
const propose = require('../core/proposer');
```

**From `src/core/learner.js`:**
```js
const propose = require('./proposer');
const { ProposalBatcher } = require('./proposal-batcher');
```

**From `src/utils/something.js`:**
```js
const { ApprovalHandler } = require('../handlers/approval-handler');
const manager = require('../core/manager');
```

## Key Principles

- **Separation of Concerns**: Each module has a single responsibility
- **Clear Imports**: All imports relative, paths reflect hierarchy
- **Entry Points**: `index.js` routes to subcommands via `bin/` scripts
- **No Circular Dependencies**: Core → Handlers → Utils → Telegram
- **Configuration**: `.env` for secrets, `.claude/` for state
