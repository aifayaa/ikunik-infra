/* eslint-disable import/no-relative-packages */
import PressArticleHandler from './PressArticleHandler';
import UGCHandler from './UGCHandler';
import ChatMessageHandler from './ChatMessageHandler';
import UsersDirectPushHandler from './UsersDirectPushHandler';
import CrowdMassNotifyPushHandler from './CrowdMassNotifyPushHandler';
import UGCModerationHandler from './UGCModerationHandler';
import UGCAutoHandler from './UGCAutoHandler';

const handlers = {
  chatMessage: ChatMessageHandler,
  crowdMassNotify: CrowdMassNotifyPushHandler,
  pressArticle: PressArticleHandler,
  ugcModeration: UGCModerationHandler,
  userArticle: UGCHandler,
  userArticleAuto: UGCAutoHandler,
  usersDirectPush: UsersDirectPushHandler,
};

function NotificationSpecificsHandler(client, appId, rootNotifQueue) {
  if (!(this instanceof NotificationSpecificsHandler)) {
    return new NotificationSpecificsHandler(client, appId, rootNotifQueue);
  }

  this.client = client;
  this.appId = appId;
  this.rootNotifQueue = rootNotifQueue;
  this.queueData = rootNotifQueue.data;

  const handler = handlers[rootNotifQueue.type];
  if (handler) {
    handler.call(this);
    Object.keys(handler.prototype).forEach((name) => {
      this[name] = handler.prototype[name];
    });
  }
}

NotificationSpecificsHandler.prototype.init = function init() {
  return false;
};

NotificationSpecificsHandler.prototype.processOne = function processOne() {
  return { canNotify: false };
};

NotificationSpecificsHandler.prototype.batchDone = function batchDone() {
  /* empty */
};

export default NotificationSpecificsHandler;
