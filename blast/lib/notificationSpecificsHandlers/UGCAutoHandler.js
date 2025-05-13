/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../../libs/mongoCollections.json';
import { formatMessage, intlInit } from '../../../libs/intl/intl';

const { COLL_APPS, COLL_SENT_NOTIFICATIONS, COLL_USER_GENERATED_CONTENTS } =
  mongoCollections;

function UGCAutoHandler() {
  /* Empty */
}

UGCAutoHandler.prototype.init = async function init() {
  const ugc = await this.client
    .db()
    .collection(COLL_USER_GENERATED_CONTENTS)
    .findOne({
      _id: this.queueData.ugcId,
      trashed: { $ne: true },
      parentCollection: '',
      parentId: null,
      type: 'article',
      'data.title': { $exists: true },
      'data.content': { $exists: true },
    });

  const app = await this.client.db().collection(COLL_APPS).findOne({
    _id: this.appId,
  });

  if (!ugc || !app) return false;

  this.ugcUserId = ugc.userId;
  this.ugcAutoNotifications = app.settings.press.ugcAutoNotifications || {};

  if (
    !this.ugcAutoNotifications.enabled ||
    (this.ugcAutoNotifications.maxPerInterval || 0) <= 0 ||
    (this.ugcAutoNotifications.interval || 0) <= 0
  ) {
    return false;
  }

  this.title = this.queueData.title;
  this.content = this.queueData.content;

  this.maxNotifications = this.ugcAutoNotifications.maxPerInterval || 4;
  const batchTimeInterval = this.ugcAutoNotifications.interval || 86400;
  const from = Math.floor(
    this.rootNotifQueue.notifyAt.getTime() / (batchTimeInterval * 1000)
  );

  this.timeFrom = new Date(from * (batchTimeInterval * 1000));
  this.timeTo = new Date((from + 1) * (batchTimeInterval * 1000));

  return true;
};

UGCAutoHandler.prototype.processOne = async function processOne({
  deviceId,
  user,
}) {
  const { title, content } = this;

  if (user && user._id === this.ugcUserId) {
    return {
      canNotify: false,
    };
  }

  const sentNotifsCount = await this.client
    .db()
    .collection(COLL_SENT_NOTIFICATIONS)
    .find({
      appId: this.appId,
      deviceId,
      type: this.rootNotifQueue.type,
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

  const payload = {
    title,
    content,
    extraData: { userArticleId: this.queueData.ugcId },
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
      type: this.rootNotifQueue.type,
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

UGCAutoHandler.prototype.batchDone = async function batchDone(abort, retry) {
  if (!abort && !retry) {
    await this.client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        { _id: this.queueData.ugcId },
        { $unset: { pendingNotificationQueueId: '' } }
      );
  }
};

export default UGCAutoHandler;
