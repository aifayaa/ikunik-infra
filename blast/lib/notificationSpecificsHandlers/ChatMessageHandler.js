/* eslint-disable import/no-relative-packages */

const CHAT_INACTIVITY_NOTIFICATION_THRESHOLD = 60 * 1000;

function ChatMessageHandler() {}

ChatMessageHandler.prototype.init = function init() {
  this.channelId = this.queueData.channelId;
  this.message = this.queueData.message;

  this.membersHash =
    this.channelMembersIds === null
      ? null
      : this.channelMembersIds.reduce((acc, userId) => {
          acc[userId] = true;
          return acc;
        }, {});

  return Promise.resolve(true);
};

ChatMessageHandler.prototype.processOne = function processOne({ user }) {
  const { message, channelId, membersHash } = this;

  if (!user) return { canNotify: false };
  if (membersHash !== null && !membersHash[user._id]) {
    return { canNotify: false };
  }

  const lastActivity =
    user.services.firebaseChat.lastActivity &&
    user.services.firebaseChat.lastActivity.getTime();
  const maxActivityTimeAllowed =
    Date.now() - CHAT_INACTIVITY_NOTIFICATION_THRESHOLD;
  if (lastActivity && lastActivity > maxActivityTimeAllowed) {
    return { canNotify: false };
  }

  return {
    canNotify: true,
    data: {
      isText: true,
      content: message,
      extraData: { channelId },
    },
  };
};

ChatMessageHandler.prototype.batchDone = function batchDone() {};

export default ChatMessageHandler;
