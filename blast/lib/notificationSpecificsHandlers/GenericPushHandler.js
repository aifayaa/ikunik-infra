function GenericPushHandler() {
  /* */
}

GenericPushHandler.prototype.init = function init() {
  this.title = this.queueData.title;
  this.content = this.queueData.content;
  this.userIds = this.queueData.userIds || [];
  this.devicesIds = this.queueData.devicesIds || [];
  this.extraData = this.queueData.extraData || {};

  return Promise.resolve(true);
};

GenericPushHandler.prototype.processOne = function processOne({
  deviceId,
  user,
}) {
  const nope = Promise.resolve({
    canNotify: false,
  });

  if (!user) {
    if (this.userIds.length > 0) {
      return nope;
    }
    if (this.devicesIds.indexOf(deviceId) < 0) {
      return nope;
    }
  } else if (
    this.userIds.indexOf(user._id) < 0 &&
    this.devicesIds.indexOf(deviceId) < 0
  ) {
    return Promise.resolve({
      canNotify: false,
    });
  }

  const payload = {
    title: this.title,
    content: this.content,
    extraData: this.extraData,
  };

  return Promise.resolve({
    canNotify: true,
    data: {
      isText: true,
      ...payload,
    },
  });
};

export default GenericPushHandler;
