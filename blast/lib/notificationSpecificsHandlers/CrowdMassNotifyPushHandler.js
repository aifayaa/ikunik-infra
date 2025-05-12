/* eslint-disable import/no-relative-packages */
import mongoViews from '../../../libs/mongoViews.json';
import BadgeChecker from '../../../libs/badges/BadgeChecker';
import { buildCrowdSearchPipeline } from '../../../crowd/lib/crowdUtils.ts';

const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

function CrowdMassNotifyPushHandler() {
  this.badgeChecker = new BadgeChecker(this.appId);
}

CrowdMassNotifyPushHandler.prototype.init = async function init() {
  const { filters } = this.queueData;

  const crowdPipeline = buildCrowdSearchPipeline(this.appId, filters);

  const pipeline = [
    ...crowdPipeline,
    { $project: { type: 1, userId: 1, deviceId: 1 } },
  ];

  const items = await this.client
    .db()
    .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
    .aggregate(pipeline)
    .toArray();

  this.devices = {};
  this.users = {};

  items.forEach((arg) => {
    const { type, userId, deviceId } = arg;
    if (type === 'user' && userId) this.users[userId] = true;
    else if (deviceId) this.devices[deviceId] = true;
  });

  return true;
};

CrowdMassNotifyPushHandler.prototype.processOne = function processOne({
  user,
  deviceId,
}) {
  let canSend = false;

  if (user) {
    if (this.users[user._id]) canSend = true;
  }
  if (deviceId) {
    if (this.devices[deviceId]) canSend = true;
  }

  if (canSend) {
    return {
      canNotify: true,
      data: {
        isText: true,
        ...this.queueData.payload,
      },
    };
  }

  return {
    canNotify: false,
  };
};

export default CrowdMassNotifyPushHandler;
