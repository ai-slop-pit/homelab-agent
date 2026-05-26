#!/usr/bin/env node
/**
 * Approval Notifier - Send approval requests to Telegram
 * Used by CLI to notify users of pending approvals
 */

const https = require('https');
const fs = require('fs');

const CONFIG_PATH = './.claude/config/telegram-config.json';

class ApprovalNotifier {
  constructor(botToken) {
    this.botToken = botToken;
    this.groupId = this.loadGroupId();
  }

  loadGroupId() {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const group = config.groups?.[0];
      return group?.id;
    } catch {
      return null;
    }
  }

  apiCall(method, params) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(params);

      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${this.botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.ok) {
              resolve(result.result);
            } else {
              reject(new Error(result.description));
            }
          } catch (e) {
            reject(new Error(`API parse error: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Send approval request to Telegram group
   */
  async notifyApproval(approval, formatFn) {
    if (!this.botToken || !this.groupId) {
      console.warn('[NOTIFIER] Cannot notify: bot token or group ID missing');
      return false;
    }

    try {
      const text = formatFn(approval);
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `approve_action:${approval.id}`,
            },
            {
              text: '❌ Reject',
              callback_data: `reject_action:${approval.id}`,
            },
          ],
        ],
      };

      await this.apiCall('sendMessage', {
        chat_id: this.groupId,
        text,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      return true;
    } catch (error) {
      console.error('[NOTIFIER] Failed to send approval:', error.message);
      return false;
    }
  }
}

module.exports = { ApprovalNotifier };
