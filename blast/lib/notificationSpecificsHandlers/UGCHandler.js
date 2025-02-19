/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

function UGCHandler() {
  /* Empty */
}

UGCHandler.prototype.init = async function init() {
  const ugc = await this.client
    .db()
    .collection(COLL_USER_GENERATED_CONTENTS)
    .findOne({
      _id: this.queueData.ugcId,
      trashed: { $ne: true },
      parentCollection: '',
      parentId: null,
      'data.title': { $exists: true },
      'data.content': { $exists: true },
    });

  if (!ugc) return false;

  this.title = this.queueData.title;
  this.content = this.queueData.content;

  return true;
};

UGCHandler.prototype.processOne = function processOne() {
  const { title, content } = this;

  return {
    canNotify: true,
    data: {
      isText: true,
      title,
      content,
      extraData: { userArticleId: this.queueData.ugcId },
    },
  };
};

UGCHandler.prototype.batchDone = async function batchDone(abort, retry) {
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

export default UGCHandler;
