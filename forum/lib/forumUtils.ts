/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { UserBadgesFieldItemType, UserType } from '@users/lib/userEntity';
import { UserBadgeType } from 'userBadges/lib/userBadgesEntities';
import BadgeChecker from '@libs/badges/BadgeChecker';
import { promiseExecUntilTrue } from '@libs/utils';

const { COLL_USER_BADGES, COLL_USERS } = mongoCollections;

export async function getUserBadgesList(
  userId: string,
  appId: string,
  { client }: { client: any }
) {
  const user = (await client
    .db()
    .collection(COLL_USERS)
    .findOne({ _id: userId, appId })) as UserType | null;

  if (!user) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      USER_NOT_FOUND_CODE,
      `The forum category ${userId} was not found`
    );
  }

  return user.badges || [];
}

function getEnabledUserBadgesIds(userBadges: Array<UserBadgesFieldItemType>) {
  const enabledUserBadgesIds = userBadges
    .filter(({ status }) => status === 'assigned' || status === 'validated')
    .map(({ id }) => id);

  return enabledUserBadgesIds;
}

type UserBadgesPermsLevelsType =
  | 'canList'
  | 'canPreview'
  | 'canRead'
  | 'canNotify';
export async function getUserBadgesByPermsLevels(
  userId: string,
  appId: string,
  {
    client,
    userBadges: inputUserBadges,
  }: { client: any; userBadges?: Array<UserBadgesFieldItemType> }
): Promise<Record<UserBadgesPermsLevelsType, Array<UserBadgeType>>> {
  inputUserBadges =
    inputUserBadges || (await getUserBadgesList(userId, appId, { client }));

  const enabledUserBadgesIds = getEnabledUserBadgesIds(inputUserBadges);
  const userBadges =
    enabledUserBadgesIds.length === 0
      ? []
      : ((await client
          .db()
          .collection(COLL_USER_BADGES)
          .find({ _id: { $in: enabledUserBadgesIds }, appId })
          .toArray()) as Array<UserBadgeType>);

  const allBadges = (await client
    .db()
    .collection(COLL_USER_BADGES)
    .find({ _id: { $in: enabledUserBadgesIds }, appId })
    .toArray()) as Array<UserBadgeType>;

  const ret: Record<UserBadgesPermsLevelsType, Array<UserBadgeType>> = {
    canList: [],
    canPreview: [],
    canRead: [],
    canNotify: [],
  };
  if (allBadges.length === 0) {
    return ret;
  }

  const badgeChecker = new BadgeChecker(appId);

  try {
    await badgeChecker.init;

    badgeChecker.registerBadges(allBadges.map(({ _id: badgeId }) => badgeId));
    await badgeChecker.loadBadges();

    const remainingBadgesToCheck = [...allBadges];
    await promiseExecUntilTrue(async () => {
      const badge = remainingBadgesToCheck.pop();
      if (!badge) return true;

      const results = await badgeChecker.checkBadges(
        userBadges,
        {
          allow: 'all',
          list: [{ id: badge._id }],
        },
        { userId }
      );

      for (let key of [
        'canList',
        'canPreview',
        'canRead',
        'canNotify',
      ] as const) {
        if (results[key]) {
          ret[key].push(badge);
        }
      }

      return false;
    });
  } finally {
    await badgeChecker.close();
  }

  return ret;
}

export async function getUserVisibleBadges(
  userId: string,
  appId: string,
  { client }: { client: any }
): Promise<Array<string>> {
  const userBadges = await getUserBadgesList(userId, appId, { client });

  const badgesQuery: any = { appId };

  if (userBadges?.length > 0) {
    badgesQuery.$or = [
      { _id: { $in: userBadges } },
      { management: 'public', storeProductId: null, subscriptionUrl: '' },
    ];
  } else {
    badgesQuery.management = 'public';
    badgesQuery.storeProductId = null;
    badgesQuery.subscriptionUrl = '';
  }

  const userVisibleBadges = (await client
    .db()
    .collection(COLL_USER_BADGES)
    .find(badgesQuery)
    .project({ _id: 1 })
    .toArray()) as Array<UserBadgeType>;

  const userVisibleBadgesIds = userVisibleBadges.map(({ _id }) => _id);

  return userVisibleBadgesIds;
}

export async function getUserFilteredBadgesIdsFromInput(
  userId: string,
  appId: string,
  inputBadgesIds: Array<string>,
  { client }: { client: any }
): Promise<Array<string>> {
  if (inputBadgesIds.length === 0) return [];

  const userVisibleBadgesIds = await getUserVisibleBadges(userId, appId, {
    client,
  });

  if (userVisibleBadgesIds.length === 0) return [];

  const filteredBadgesIds = inputBadgesIds.filter(
    (id) => userVisibleBadgesIds.indexOf(id) >= 0
  );

  return filteredBadgesIds;
}
