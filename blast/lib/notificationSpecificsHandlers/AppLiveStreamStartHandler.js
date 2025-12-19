/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../../libs/mongoCollections.json';
import BadgeChecker from '../../../libs/badges/BadgeChecker';
import { formatMessage, intlInit } from '../../../libs/intl/intl';

const { COLL_APP_LIVE_STREAMS, COLL_PRESS_CATEGORIES, COLL_USERS } =
  mongoCollections;

const { REGION } = process.env;
const LANGS = {
  'us-east-1': 'en',
  'eu-west-3': 'fr',
};

function getLang() {
  if (LANGS[REGION]) return LANGS[REGION];
  return LANGS['us-east-1'];
}

async function getUsername(userId, appId, { client }) {
  const user = await client
    .db()
    .collection(COLL_USERS)
    .findOne({ _id: userId, appId });

  if (!user) return userId;

  if (user.profile) {
    if (user.profile.firstname && user.profile.lastname) {
      return `${user.profile.firstname} ${user.profile.lastname}`;
    }

    if (user.profile.username) {
      return user.profile.username;
    }
  }

  if (user.username) {
    return user.username;
  }

  return userId;
}

function AppLiveStreamStartHandler() {
  this.badgeChecker = new BadgeChecker(this.appId);
}

AppLiveStreamStartHandler.prototype.init = async function init() {
  const { liveStreamId } = this.queueData;

  const dbStream = await this.client
    .db()
    .collection(COLL_APP_LIVE_STREAMS)
    .findOne({ _id: liveStreamId });

  if (!dbStream) return false;
  this.dbStream = dbStream;

  const category = await this.client
    .db()
    .collection(COLL_PRESS_CATEGORIES)
    .findOne({ _id: dbStream.categoryId, appId: dbStream.appId });

  if (!category) return false;
  this.category = category;

  this.haveBadges = false;
  if (category.badges && category.badges.list.length > 0) {
    this.haveBadges = true;
    const badgeIds = [];
    category.badges.list.forEach(({ id }) => {
      badgeIds.push(id);
    });
    await this.badgeChecker.loadBadges(badgeIds);
  }

  const userName = await getUsername(dbStream.createdBy, dbStream.appId, {
    client: this.client,
  });

  intlInit(getLang());

  this.title = formatMessage(`appLiveStreams:notifications.start.title`);
  this.content = formatMessage(`appLiveStreams:notifications.start.text`, {
    userName,
  });

  return true;
};

AppLiveStreamStartHandler.prototype.processOne = async function processOne({
  user /* , deviceId */,
}) {
  if (user && user._id === this.dbStream.createdBy) {
    return {
      canNotify: false,
    };
  }

  if (!this.haveBadges) {
    return {
      canNotify: true,
      data: {
        isText: true,
        title: this.title,
        content: this.content,
        extraData: { liveStreamId: this.dbStream._id },
      },
    };
  }

  const userBadges = (user && user.badges) || [];

  const checkerResults = await this.badgeChecker.checkBadges(
    userBadges,
    this.category.badges,
    {
      userId: user && user._id,
      appId: this.dbStream.appId,
    }
  );

  if (checkerResults.canNotify) {
    return {
      canNotify: true,
      data: {
        isText: true,
        title: this.title,
        content: this.content,
        extraData: { liveStreamId: this.dbStream._id },
      },
    };
  }

  return {
    canNotify: false,
  };
};

AppLiveStreamStartHandler.prototype.batchDone =
  async function batchDone(/* abort, retry */) {
    await this.badgeChecker.close();
  };

export default AppLiveStreamStartHandler;
