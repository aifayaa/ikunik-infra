/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../../libs/mongoCollections.json';
import { formatMessage, intlInit } from '../../../libs/intl/intl';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

const { REGION } = process.env;

function getLang(ugc) {
  if (ugc.lang) return ugc.lang;
  if (REGION === 'eu-west-3') return 'fr';
  return 'en';
}

function UGCModerationHandler() {
  /* Empty */
}

UGCModerationHandler.prototype.init = async function init() {
  const ugc = await this.client
    .db()
    .collection(COLL_USER_GENERATED_CONTENTS)
    .findOne({ _id: this.queueData.ugcId });

  if (!ugc) return false;

  intlInit(getLang(ugc));

  const validatedKey = this.queueData.validated ? 'validated' : 'rejected';
  const sourceKey = this.queueData.human ? 'human' : 'ai';
  const title = formatMessage(
    `ugc:moderation_notification.${validatedKey}.${sourceKey}.title`,
    {
      reason: this.queueData.reason,
      abstract: this.queueData.abstract,
    }
  );
  const content = formatMessage(
    `ugc:moderation_notification.${validatedKey}.${sourceKey}.text`,
    {
      reason: this.queueData.reason,
      abstract: this.queueData.abstract,
    }
  );

  const extraData = {};
  if (!ugc.rootParentId) {
    extraData.userArticleId = ugc._id;
  } else if (ugc.rootParentCollection === 'userGeneratedContents') {
    extraData.userArticleId = ugc.rootParentId;
  } else if (ugc.rootParentCollection === 'pressArticles') {
    extraData.articleId = ugc.rootParentId;
  } else {
    extraData.userArticleId = ugc._id;
  }

  this.userId = ugc.userId;
  this.title = title;
  this.content = content;
  this.extraData = extraData;

  return true;
};

UGCModerationHandler.prototype.processOne = function processOne({ user }) {
  if (!user) {
    return {
      canNotify: false,
    };
  }

  if (this.userId !== user._id) {
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
      extraData: this.extraData,
    },
  };
};

UGCModerationHandler.prototype.batchDone = async function batchDone(
  abort,
  retry
) {
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

export default UGCModerationHandler;
