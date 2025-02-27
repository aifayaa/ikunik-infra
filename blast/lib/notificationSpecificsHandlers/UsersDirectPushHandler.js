/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../../libs/mongoCollections.json';

const { COLL_APPS, COLL_SENT_NOTIFICATIONS } = mongoCollections;

function UsersDirectPushHandler() {
  /* */
}

UsersDirectPushHandler.prototype.init = async function init() {
  const app = await this.client.db().collection(COLL_APPS).findOne({
    _id: this.appId,
  });

  this.ugcAutoNotifications = app.settings.press.ugcAutoNotifications || {};

  if (
    !this.ugcAutoNotifications.enabled ||
    (this.ugcAutoNotifications.maxPerInterval || 0) <= 0 ||
    (this.ugcAutoNotifications.interval || 0) <= 0
  ) {
    return false;
  }

  this.maxNotifications = this.ugcAutoNotifications.maxPerInterval || 4;
  const batchTimeInterval = this.ugcAutoNotifications.interval || 86400;
  const from = Math.floor(
    this.rootNotifQueue.notifyAt.getTime() / (batchTimeInterval * 1000)
  );

  this.timeFrom = new Date(from * (batchTimeInterval * 1000));
  this.timeTo = new Date((from + 1) * (batchTimeInterval * 1000));

  this.title = this.queueData.title;
  this.content = this.queueData.content;
  this.userIds = this.queueData.userIds;
  this.extraData = this.queueData.extraData;

  this.commentType = this.queueData.commentType;

  return true;
};

UsersDirectPushHandler.prototype.processOne = async function processOne({
  deviceId,
  user,
}) {
  if (this.userIds.indexOf(user._id) < 0) {
    return {
      canNotify: false,
    };
  }

  if (this.commentType === 'commentReply') {
    const sentNotifsCount = await this.client
      .db()
      .collection(COLL_SENT_NOTIFICATIONS)
      .find({
        appId: this.appId,
        deviceId,
        type: `${this.rootNotifQueue.type}-${this.commentType}`,
        sentAt: {
          $gte: this.timeFrom,
          $lt: this.timeTo,
        },
      })
      .limit(this.maxNotifications)
      .count();

    if (sentNotifsCount === this.maxNotifications) {
      return {
        canNotify: false,
      };
    }
  }

  // commentType 'postComment', 'commentReply',

  const payload = {
    title: this.title,
    content: this.content,
    extraData: this.extraData || {},
  };

  await this.client
    .db()
    .collection(COLL_SENT_NOTIFICATIONS)
    .insertOne({
      appId: this.appId,
      deviceId,
      userId: (user && user._id) || null,
      sentAt: new Date(),
      queueId: this.rootNotifQueue._id,
      type: `${this.rootNotifQueue.type}-${this.commentType}`,
      payload,
    });

  return {
    canNotify: true,
    data: {
      isText: true,
      ...payload,
    },
  };
};

export default UsersDirectPushHandler;
