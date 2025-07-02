import MongoClient from '@libs/mongoClient';
import { objGet, promiseExecUntilTrue, PromiseQueue } from '@libs/utils';
import mongoCollections from '@libs/mongoCollections.json';
import { MyFidApi } from '@libs/backends/ghanty-myfid';
import { COUPONS_STATUSES_CLIENT_MAP } from '@libs/ghanty-constants';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GHANTY_MYFID_TO_NOTIFY_TYPES } from './ghantyConstants';

const { REGION, STAGE } = process.env as {
  REGION: string;
  STAGE: string;
};

const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

const { COLL_APPS, COLL_USERS } = mongoCollections;

const FID_BAD_USERS_USERNAMES: Record<string, boolean> = {
  CFI00000393775: true,
  CFI00000398076: true,
  WLC00000000011: true,
  CFI00000398397: true,
  'ZEENAT-NAMOOYA': true,
  'CFI00000398076-2': true,
  CYNTHIA: true,
};

const FID_API_PAGE_SIZE = 10;
const FID_PARALLEL_USERS_PROCESSING = 30;
const FID_LAMBDA_MAX_DURATION_MS = 8 * 60 * 1000; // Total execution is 10, keep a safe margin to launch notifications
const FID_DAYS_TO_SENT_COUPONS_NOTIFICATIONS = [21, 16, 11, 7, 3];
const FID_DAYS_TO_SENT_PROPOSALS_NOTIFICATIONS = [4, 2];

const FID_SOURCE_TIMEZONE_HOUR = 4;
const FID_TARGET_TIMEZONE_HOUR = 4;
const FID_TARGET_NOTIFICATION_HOUR = 9;

type CouponPartialType = {
  id: number;
  expirationDate: string;
};
type ProposalPartialType = {
  id: number;
  expirationDate: string;
};

function getTargetNotificationTime() {
  const now = new Date();

  let targetTime = new Date();
  targetTime.setUTCHours(
    FID_TARGET_NOTIFICATION_HOUR - FID_TARGET_TIMEZONE_HOUR,
    0,
    0,
    0
  );

  if (now >= targetTime) {
    targetTime.setUTCDate(targetTime.getUTCDate() + 1);
  }

  return targetTime;
}

// Dates received are utc+4. Apply them as UTC-0 and then shift the hours appropriately to use UTC+4 time
function parseRemoteDate(str: string) {
  const ymdhms = str.split(/[^0-9]+/).map((x) => parseInt(x, 10));
  const d = new Date();

  d.setUTCFullYear(ymdhms[0]);
  d.setUTCMonth(ymdhms[1] - 1);
  d.setUTCDate(ymdhms[2]);
  d.setUTCHours(ymdhms[3]);
  d.setUTCMinutes(ymdhms[4]);
  d.setUTCSeconds(ymdhms[5]);
  d.setUTCMilliseconds(0);

  d.setUTCHours(d.getUTCHours() - FID_SOURCE_TIMEZONE_HOUR);

  return d;
}

function timeDiffToNow(targetDate: Date, now: Date) {
  const tdiff = targetDate.getTime() - now.getTime();
  const days = tdiff / (1000 * 60 * 60 * 24);
  return Math.floor(days);
}

async function getCouponsToNotify(
  username: string,
  { fidApi, now }: { fidApi: MyFidApi; now: Date }
) {
  let closestMatchingCouponsCount = 0;
  let closestMatchingCouponsDays =
    Math.max(...FID_DAYS_TO_SENT_COUPONS_NOTIFICATIONS) + 1;
  let fetchedItems = 0;
  let page = 1;
  const couponsIds: Array<string> = [];

  await promiseExecUntilTrue(async () => {
    const couponsResponse = await fidApi.call(
      `/users/${username}/coupons?statuses=${COUPONS_STATUSES_CLIENT_MAP.enabled}&pageSize=${FID_API_PAGE_SIZE}&pageNumber=${page}`
    );

    if (couponsResponse.coupons.length === 0) return true;

    couponsResponse.coupons.forEach((coupon: CouponPartialType) => {
      const expirationDate = parseRemoteDate(coupon.expirationDate);
      const days = timeDiffToNow(expirationDate, now);

      couponsIds.push(`${coupon.id}`);

      if (FID_DAYS_TO_SENT_COUPONS_NOTIFICATIONS.indexOf(days) >= 0) {
        if (closestMatchingCouponsDays > days) {
          closestMatchingCouponsDays = days;
          closestMatchingCouponsCount = 1;
        } else if (closestMatchingCouponsDays === days) {
          closestMatchingCouponsCount += 1;
        }
      }
    });

    fetchedItems += couponsResponse.coupons.length;
    if (fetchedItems >= couponsResponse.total) {
      return true;
    } else {
      page += 1;
      return false;
    }
  });

  if (closestMatchingCouponsCount === 0) {
    return {
      ids: couponsIds,
      expiringCount: 0,
      expiringDays: -1,
    };
  }

  return {
    ids: couponsIds,
    expiringCount: closestMatchingCouponsCount,
    expiresInDays: closestMatchingCouponsDays,
  };
}
async function getProposalsToNotify(
  username: string,
  { fidApi, now }: { fidApi: MyFidApi; now: Date }
) {
  let closestMatchingProposalsCount = 0;
  let closestMatchingProposalsDays =
    Math.max(...FID_DAYS_TO_SENT_PROPOSALS_NOTIFICATIONS) + 1;
  let fetchedItems = 0;
  let page = 1;
  const proposalsIds: Array<string> = [];

  await promiseExecUntilTrue(async () => {
    const proposalsResponse = await fidApi.call(
      `/users/${username}/proposals?pageSize=${FID_API_PAGE_SIZE}&pageNumber=${page}`
    );

    if (proposalsResponse.proposals.length === 0) return true;

    proposalsResponse.proposals.forEach((proposal: ProposalPartialType) => {
      const expirationDate = parseRemoteDate(proposal.expirationDate);
      const days = timeDiffToNow(expirationDate, now);

      proposalsIds.push(`${proposal.id}`);

      if (FID_DAYS_TO_SENT_PROPOSALS_NOTIFICATIONS.indexOf(days) >= 0) {
        if (closestMatchingProposalsDays > days) {
          closestMatchingProposalsDays = days;
          closestMatchingProposalsCount = 1;
        } else if (closestMatchingProposalsDays === days) {
          closestMatchingProposalsCount += 1;
        }
      }
    });

    fetchedItems += proposalsResponse.proposals.length;
    if (fetchedItems >= proposalsResponse.total) {
      return true;
    } else {
      page += 1;
      return false;
    }
  });

  if (closestMatchingProposalsCount === 0) {
    return {
      ids: proposalsIds,
      expiringCount: 0,
      expiresInDays: -1,
    };
  }

  return {
    ids: proposalsIds,
    expiringCount: closestMatchingProposalsCount,
    expiresInDays: closestMatchingProposalsDays,
  };
}

export default async (appId: string, offset: number) => {
  const queue = new PromiseQueue(FID_PARALLEL_USERS_PROCESSING, false);
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const fidApi = new MyFidApi(app);
    await fidApi.renewLoginTokenIfNeeded(client);

    const usersCursor = client
      .db()
      .collection(COLL_USERS)
      .find({ appId })
      .sort([['createdAt', 1]])
      .skip(offset);

    const now = new Date();

    const stopAfter = now.getTime() + FID_LAMBDA_MAX_DURATION_MS;

    let retry = true;
    let processedUsersCount = 0;

    await promiseExecUntilTrue(async () => {
      const hasNext = await usersCursor.hasNext();
      if (!hasNext) {
        retry = false;
        return true;
      }

      const user = await usersCursor.next();
      processedUsersCount += 1;

      if (FID_BAD_USERS_USERNAMES[user.username]) {
        return false;
      }

      const processUser = async () => {
        try {
          const lastCoupons = objGet(
            user,
            'services.ghantyNotifications.coupons',
            null
          );
          const lastProposals = objGet(
            user,
            'services.ghantyNotifications.proposals',
            null
          );
          const coupons = await getCouponsToNotify(user.username, {
            fidApi,
            now,
          });

          const proposals = await getProposalsToNotify(user.username, {
            fidApi,
            now,
          });

          await client
            .db()
            .collection(COLL_USERS)
            .updateOne(
              { _id: user._id },
              {
                $set: {
                  'services.ghantyNotifications.lastCoupons': lastCoupons,
                  'services.ghantyNotifications.lastProposals': lastProposals,
                  'services.ghantyNotifications.coupons': coupons,
                  'services.ghantyNotifications.proposals': proposals,
                  'services.ghantyNotifications.updatedAt': new Date(),
                },
              }
            );
        } catch (e) {
          console.error(
            `Caught error fetching/updating user ${user._id} (${user.username}): ${e}`
          );
        }
      };

      await queue.add(processUser());

      if (Date.now() >= stopAfter) {
        return true;
      }

      return false;
    });

    await queue.flush();

    if (!retry) {
      const notifyAt = getTargetNotificationTime();

      const promises = Object.keys(GHANTY_MYFID_TO_NOTIFY_TYPES).map(
        async (notify) => {
          await lambda.send(
            new InvokeCommand({
              InvocationType: 'Event',
              FunctionName: `blast-${STAGE}-queueNotifications`,
              Payload: JSON.stringify({
                appId,
                notifyAt,
                type: 'ghantyMyFid',
                data: {
                  notify,
                },
              }),
            })
          );
        }
      );

      await Promise.all(promises);
    }

    return { retry, offset: offset + processedUsersCount };
  } finally {
    await queue.flush();
    await client.close();
  }
};
