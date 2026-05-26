const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '/opt/claude-agent/config/telegram-config.json';

class TopicManager {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
    } catch (err) {
      console.error('[TOPICS] Config load error:', err.message);
    }
    return { groups: [], topics: {} };
  }

  saveConfig() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      return true;
    } catch (err) {
      console.error('[TOPICS] Config save error:', err.message);
      return false;
    }
  }

  // Create a forum topic in a group
  async createTopic(bot, groupId, topicName, description = '') {
    try {
      console.log(`[TOPICS] Creating topic "${topicName}" in group ${groupId}`);

      const result = await bot.telegram.callApi('createForumTopic', {
        chat_id: groupId,
        name: topicName,
        icon_emoji_id: this.getEmojiForTopic(topicName)
      });

      const topicId = result.message_thread_id;

      // Store topic mapping
      this.config.topics = this.config.topics || {};
      this.config.topics[topicName] = {
        id: topicId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        description: description
      };

      this.saveConfig();
      console.log(`[TOPICS] ✅ Created topic "${topicName}" (ID: ${topicId})`);

      return { success: true, topicId, topicName };
    } catch (err) {
      console.error(`[TOPICS] Failed to create "${topicName}":`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Create single system proposals topic
  async createProposalTopics(bot, groupId) {
    return [await this.createTopic(bot, groupId, 'system-proposals', 'Agent system proposals')];
  }

  // Get topic ID by name
  getTopicId(topicName) {
    const topic = this.config.topics?.[topicName];
    return topic?.id || null;
  }

  // All proposals go to system-proposals
  getTopicNameForProposal(proposalType) {
    return 'system-proposals';
  }

  // Get emoji ID for topic (Telegram emoji)
  getEmojiForTopic(topicName) {
    const emojis = {
      'system-proposals': '🏗️',
      'homelab': '🔬',
      'general': '💬',
      'media': '🎬',
      'dev': '💻'
    };
    return emojis[topicName] || '📌';
  }

  // List all topics
  listTopics() {
    const topics = this.config.topics || {};
    return Object.entries(topics).map(([name, data]) => ({
      name,
      id: data.id,
      created: new Date(data.created_at).toLocaleDateString(),
      description: data.description || '(no description)'
    }));
  }

  // Delete topic from Telegram and config
  async deleteTopic(bot, groupId, topicId) {
    try {
      console.log(`[TOPICS] Deleting topic ID ${topicId} from Telegram`);
      await bot.telegram.callApi('deleteForumTopic', {
        chat_id: groupId,
        message_thread_id: topicId
      });
      console.log(`[TOPICS] ✅ Deleted topic ID ${topicId}`);
      return { success: true };
    } catch (err) {
      console.error(`[TOPICS] Failed to delete topic:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Delete topic reference from config
  removeTopic(topicName) {
    if (this.config.topics?.[topicName]) {
      delete this.config.topics[topicName];
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Get routing info for a proposal
  getRoutingInfo(proposalType) {
    const topicName = this.getTopicNameForProposal(proposalType);
    const topicId = this.getTopicId(topicName);
    return {
      topicName,
      topicId,
      messageThreadId: topicId // Telegram API parameter name
    };
  }
}

module.exports = { TopicManager };
