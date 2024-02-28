/* eslint-disable import/no-relative-packages */
function UsersDirectPushHandler() {}

UsersDirectPushHandler.prototype.init = function init() {
  this.title = this.queueData.title;
  this.content = this.queueData.content;
  this.userIds = this.queueData.userIds;
  this.extraData = this.queueData.extraData;

  return true;
};

UsersDirectPushHandler.prototype.processOne = function processOne({ user }) {
  if (this.userIds.indexOf(user._id) < 0) {
    return {
      canNotify: false,
    };
  }

  return {
    canNotify: true,
    data: {
      isText: true,
      title: this.title,
      content: this.content,
      extraData: this.extraData || {},
    },
  };
};

export default UsersDirectPushHandler;
