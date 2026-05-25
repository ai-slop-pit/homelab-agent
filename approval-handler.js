#!/usr/bin/env node
/**
 * Approval Handler - Manage approvals between CLI and Telegram
 * Stores pending approvals in agent-state.json
 * CLI waits for approval via Telegram buttons
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AGENT_STATE_PATH = './.claude/agent-state.json';
const APPROVAL_TIMEOUT = 300000; // 5 minutes

class ApprovalHandler {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(AGENT_STATE_PATH)) {
        const data = fs.readFileSync(AGENT_STATE_PATH, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('[APPROVAL] State load error:', err.message);
    }
    return { approvals: {}, approval_history: [] };
  }

  saveState() {
    try {
      fs.writeFileSync(AGENT_STATE_PATH, JSON.stringify(this.state, null, 2));
      return true;
    } catch (err) {
      console.error('[APPROVAL] State save error:', err.message);
      return false;
    }
  }

  /**
   * Request approval from user via Telegram
   * Returns approval ID that CLI can wait on
   */
  requestApproval(action, details) {
    const approvalId = crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();

    const approval = {
      id: approvalId,
      action,
      details,
      status: 'pending', // pending, approved, rejected
      requested_at: timestamp,
      responded_at: null,
      response_reason: null,
    };

    if (!this.state.approvals) this.state.approvals = {};
    this.state.approvals[approvalId] = approval;
    this.saveState();

    return approvalId;
  }

  /**
   * CLI polls this to check if approval was granted
   */
  checkApproval(approvalId, timeoutMs = APPROVAL_TIMEOUT) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const check = () => {
        const approval = this.state.approvals?.[approvalId];

        if (!approval) {
          resolve({ status: 'not_found', id: approvalId });
          return;
        }

        if (approval.status === 'approved') {
          resolve({ status: 'approved', id: approvalId });
          return;
        }

        if (approval.status === 'rejected') {
          resolve({
            status: 'rejected',
            id: approvalId,
            reason: approval.response_reason,
          });
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve({ status: 'timeout', id: approvalId });
          return;
        }

        // Reload state from file (in case bot updated it)
        this.state = this.loadState();
        setTimeout(check, 1000); // Check every 1 second
      };

      check();
    });
  }

  /**
   * Telegram bot calls this to record user's response
   */
  respondToApproval(approvalId, status, reason = null) {
    const approval = this.state.approvals?.[approvalId];

    if (!approval) {
      return { success: false, error: 'Approval not found' };
    }

    if (approval.status !== 'pending') {
      return { success: false, error: 'Approval already responded' };
    }

    approval.status = status; // 'approved' or 'rejected'
    approval.responded_at = new Date().toISOString();
    approval.response_reason = reason;

    // Log to history
    if (!this.state.approval_history) this.state.approval_history = [];
    this.state.approval_history.push({
      ...approval,
      logged_at: new Date().toISOString(),
    });

    this.saveState();

    return { success: true, status };
  }

  /**
   * Get all pending approvals (for bot to display)
   */
  getPendingApprovals() {
    return Object.values(this.state.approvals || {}).filter(
      (a) => a.status === 'pending'
    );
  }

  /**
   * Format approval for display
   */
  formatApproval(approval) {
    const details = approval.details || {};
    let message = `🔒 **Action Approval Needed**\n\n`;
    message += `Action: \`${approval.action}\`\n`;
    message += `ID: \`${approval.id}\`\n\n`;

    if (details.description) {
      message += `📝 ${details.description}\n\n`;
    }

    if (details.items && Array.isArray(details.items)) {
      message += `Items to ${approval.action}:\n`;
      details.items.forEach((item) => {
        message += `  • ${item}\n`;
      });
      message += '\n';
    }

    if (details.warning) {
      message += `⚠️  **Warning**: ${details.warning}\n\n`;
    }

    message += `Requested: ${new Date(approval.requested_at).toLocaleString()}`;

    return message;
  }
}

module.exports = { ApprovalHandler };
