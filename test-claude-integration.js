#!/usr/bin/env node

const { spawnSync } = require('child_process');

function callClaude(userMessage, conversationHistory = []) {
  try {
    // Build prompt with conversation context
    let prompt = '';
    if (conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
      }
    }
    prompt += `User: ${userMessage}`;

    console.log('[TEST] Calling Claude with prompt:', prompt.slice(0, 100));

    // Call Claude CLI with full path and proper environment
    const result = spawnSync('/usr/bin/claude', ['-p', prompt], {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    console.log('[TEST] Spawn completed. Status:', result.status);
    console.log('[TEST] Has error:', !!result.error);
    console.log('[TEST] Stderr length:', result.stderr?.length || 0);
    console.log('[TEST] Stdout length:', result.stdout?.length || 0);

    if (result.error) {
      console.error('[TEST] Spawn error:', result.error.message);
      return null;
    }

    if (result.status !== 0) {
      console.error('[TEST] Exit code:', result.status);
      console.error('[TEST] Stderr:', result.stderr?.slice(0, 500));
      console.error('[TEST] Stdout:', result.stdout?.slice(0, 200));
      return null;
    }

    const output = result.stdout?.trim();
    if (!output) {
      console.error('[TEST] Empty response from claude CLI');
      return null;
    }

    console.log('[TEST] Got response:', output.slice(0, 100));
    return output;
  } catch (err) {
    console.error('[TEST] Exception:', err.message);
    return null;
  }
}

console.log('[TEST] Testing Claude integration...');
const response = callClaude('What is 2+2?');
if (response) {
  console.log('[TEST] ✅ SUCCESS: Got response from Claude');
  console.log('[TEST] Response preview:', response.slice(0, 200));
} else {
  console.log('[TEST] ❌ FAILED: No response from Claude');
}
