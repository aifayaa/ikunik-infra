/* eslint-disable import/no-relative-packages */
import PressArticleHandler from './PressArticleHandler';
import UGCHandler from './UGCHandler';
import ChatMessageHandler from './ChatMessageHandler';
import UsersDirectPushHandler from './UsersDirectPushHandler';

const handlers = {
  pressArticle: PressArticleHandler,
  userArticle: UGCHandler,
  'chat-message': ChatMessageHandler,
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

NotificationSpecificsHandler.prototype.batchDone = function batchDone() {};

export default NotificationSpecificsHandler;
