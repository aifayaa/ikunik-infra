import PressArticleHandler from './PressArticleHandler';
import UGCHandler from './UGCHandler';

function NotificationSpecificsHandler(client, appId, rootNotifQueue) {
  if (!(this instanceof NotificationSpecificsHandler)) {
    return (new NotificationSpecificsHandler(client, appId, rootNotifQueue));
  }

  this.client = client;
  this.appId = appId;
  this.rootNotifQueue = rootNotifQueue;
  this.queueData = rootNotifQueue.data;

  if (rootNotifQueue.type === 'pressArticle') {
    PressArticleHandler.call(this);
    Object.keys(PressArticleHandler.prototype).forEach((name) => {
      this[name] = PressArticleHandler.prototype[name];
    });
  } else if (rootNotifQueue.type === 'userArticle') {
    UGCHandler.call(this);
    Object.keys(UGCHandler.prototype).forEach((name) => {
      this[name] = UGCHandler.prototype[name];
    });
  }
}

NotificationSpecificsHandler.prototype.init = function init() {
  return (false);
};

NotificationSpecificsHandler.prototype.processOne = function processOne() {
  return ({ canNotify: false });
};

NotificationSpecificsHandler.prototype.batchDone = function batchDone() {};

export default NotificationSpecificsHandler;
