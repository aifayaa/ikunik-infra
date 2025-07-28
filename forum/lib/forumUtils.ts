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
import {
  arrayUniq,
  indexObjectArrayWithKey,
  promiseExecUntilTrue,
} from '@libs/utils';
import { ForumCategoryType, ForumTopicType } from './forumEntities';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';

const {
  COLL_FORUM_CATEGORIES,
  COLL_FORUM_TOPIC_REPLIES,
  COLL_FORUM_TOPICS,
  COLL_USER_BADGES,
  COLL_USER_REACTIONS,
  COLL_USERS,
} = mongoCollections;

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
export type GetUserBadgesPermsLevelsReturnType = Record<
  UserBadgesPermsLevelsType,
  Array<UserBadgeType>
>;
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
    .find({ appId })
    .toArray()) as Array<UserBadgeType>;

  const ret: GetUserBadgesPermsLevelsReturnType = {
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

type AddExtraTopicsFieldsParamsType = {
  userId: string;
  client: any;
  appId: string;

  checkBadges?: boolean;
  userBadges?: Array<UserBadgesFieldItemType>;
  badgesByPerms?: GetUserBadgesPermsLevelsReturnType;
};
type AddExtraTopicsFieldsReturnedType = ForumTopicType & {
  author?: {};

  liked?: boolean;

  restrictedBy?: Array<UserBadgeType>;
  cannotRead?: true;
  previewOnly?: true;
};
export async function addExtraTopicsFields(
  inputTopics: Array<ForumTopicType>,
  {
    checkBadges = false,
    userId,
    client,
    appId,
    userBadges,
    badgesByPerms,
  }: AddExtraTopicsFieldsParamsType
) {
  const topicsList: Array<AddExtraTopicsFieldsReturnedType> = [...inputTopics];

  // Authors
  const authorsIds = arrayUniq(topicsList.map(({ createdBy }) => createdBy));
  if (topicsList.length > 0) {
    const authors =
      authorsIds.length === 0
        ? []
        : await client
            .db()
            .collection(COLL_USERS)
            .find(
              { _id: { $in: authorsIds } },
              { projection: userPrivateFieldsProjection }
            )
            .toArray();

    const indexedAuthors = indexObjectArrayWithKey(authors);
    topicsList.forEach((topic) => {
      if (indexedAuthors[topic.createdBy]) {
        topic.author = indexedAuthors[topic.createdBy];
      } else {
        topic.author = {};
      }
    });
  }

  // Self Like
  const targetCollection = COLL_FORUM_TOPICS;
  const reactionType = 'reaction';
  const likesPromises = topicsList.map(async ({ _id }, arrayId) => {
    const targetId = _id;
    const reaction = await client.db().collection(COLL_USER_REACTIONS).findOne({
      appId,
      targetCollection,
      targetId,
      userId,
      reactionType,
      reactionName: 'like',
    });

    if (reaction) {
      topicsList[arrayId].liked = true;
    } else {
      topicsList[arrayId].liked = false;
    }
  });
  await Promise.all(likesPromises);

  // Badges
  if (checkBadges) {
    userBadges =
      userBadges || (await getUserBadgesList(userId, appId, { client }));

    badgesByPerms =
      badgesByPerms ||
      (await getUserBadgesByPermsLevels(userId, appId, {
        client,
        userBadges,
      }));

    const badgeChecker = new BadgeChecker(appId);

    try {
      await badgeChecker.init;

      badgeChecker.registerBadges(
        badgesByPerms.canList.map(({ _id: badgeId }) => badgeId)
      );
      await badgeChecker.loadBadges();

      const promises = topicsList.map(async (topic) => {
        if (topic.badges.list.length > 0) {
          const results = await badgeChecker.checkBadges(
            userBadges,
            topic.badges,
            { userId }
          );
          if (!results.canRead) {
            if (results.canPreview) {
              topic.previewOnly = true;
              topic.restrictedBy = results.restrictedBy;
            } else {
              topic.content = '';
              topic.cannotRead = true;
              topic.restrictedBy = results.restrictedBy;
            }
          }
        }
      });

      await Promise.all(promises);
    } finally {
      await badgeChecker.close();
    }
  }

  return topicsList;
}

export async function updateTopicViewsCount(
  topic: ForumTopicType,
  { client }: { client: any }
) {
  const count = await client
    .db()
    .collection(COLL_USER_REACTIONS)
    .find({
      appId: topic.appId,
      targetCollection: COLL_FORUM_TOPICS,
      targetId: topic._id,
      reactionType: 'view',
      reactionName: 'view',
    })
    .count();

  await client
    .db()
    .collection(COLL_FORUM_TOPICS)
    .updateOne(
      { _id: topic._id },
      {
        $set: {
          'stats.viewsCount': count,
        },
      }
    );

  topic.stats.viewsCount = count;
}

export async function updateTopicLikesCount(
  topic: ForumTopicType,
  { client }: { client: any }
) {
  const count = await client
    .db()
    .collection(COLL_USER_REACTIONS)
    .find({
      appId: topic.appId,
      targetCollection: COLL_FORUM_TOPICS,
      targetId: topic._id,
      reactionType: 'reaction',
      reactionName: 'like',
    })
    .count();

  await client
    .db()
    .collection(COLL_FORUM_TOPICS)
    .updateOne(
      { _id: topic._id },
      {
        $set: {
          'stats.likesCount': count,
        },
      }
    );

  topic.stats.likesCount = count;
}

export async function updateTopicRepliesCount(
  topic: ForumTopicType,
  { client }: { client: any }
) {
  const count = await client
    .db()
    .collection(COLL_FORUM_TOPIC_REPLIES)
    .find({
      appId: topic.appId,
      topicId: topic._id,
      categoryId: topic.categoryId,
    })
    .count();

  await client
    .db()
    .collection(COLL_FORUM_TOPICS)
    .updateOne(
      { _id: topic._id },
      {
        $set: {
          'stats.repliesCount': count,
        },
      }
    );

  topic.stats.repliesCount = count;
}

export async function updateCategoryTopicsCount(
  category: ForumCategoryType,
  { client }: { client: any }
) {
  const count = await client
    .db()
    .collection(COLL_FORUM_TOPICS)
    .find({
      appId: category.appId,
      categoryId: category._id,
    })
    .count();

  await client
    .db()
    .collection(COLL_FORUM_CATEGORIES)
    .updateOne(
      { _id: category._id },
      {
        $set: {
          'stats.topicsCount': count,
        },
      }
    );

  category.stats.topicsCount = count;
}
