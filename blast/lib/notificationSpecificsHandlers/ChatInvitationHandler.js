/* eslint-disable import/no-relative-packages */

function ChatInvitationHandler() {}

ChatInvitationHandler.prototype.init = function init() {
  this.fromUserId = this.queueData.fromUserId;
  this.toUserId = this.queueData.toUserId;
  this.title = this.queueData.title;
  this.text = this.queueData.text;
  this.channelId = this.queueData.channelId;

  return Promise.resolve(true);
};

ChatInvitationHandler.prototype.processOne = function processOne({ user }) {
  const { toUserId, channelId, title, text } = this;

  if (!user) return { canNotify: false };
  if (user._id !== toUserId) {
    return { canNotify: false };
  }

  return {
    canNotify: true,
    data: {
      content: text,
      extraData: { channelId, isInvitation: true },
      isText: true,
      title,
    },
  };
};

ChatInvitationHandler.prototype.batchDone = function batchDone() {};

export default ChatInvitationHandler;
