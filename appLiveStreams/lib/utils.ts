import MongoClient from '../../libs/mongoClient';
import { AppLiveStreamType } from './appLiveStreamTypes';
import mongoCollections from '../../libs/mongoCollections.json';
import { PressCategoryType } from 'pressCategories/lib/pressCategoriesTypes';
import { UserType } from '@users/lib/userEntity';
import BadgeChecker from '@libs/badges/BadgeChecker';
import { UserBadgeType } from 'userBadges/lib/userBadgesEntities';

const { COLL_USERS, COLL_PRESS_CATEGORIES } = mongoCollections;

export const ALS_EXPIRATION_DELAY_MIN = 1 * 24 * 60; // 1 day
export const ALS_EXPIRATION_DELAY_MS = ALS_EXPIRATION_DELAY_MIN * 60 * 1000;

export function filterAppLiveStreamOutput(
  input: AppLiveStreamType,
  includeStreamingKey = false
) {
  return {
    _id: input._id,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    appId: input.appId,
    categoryId: input.categoryId,
    startDateTime: input.startDateTime,
    expireDateTime: input.expireDateTime,
    state: input.state,

    ...(includeStreamingKey ? { userStreamToken: input.userStreamToken } : {}),
  };
}

async function getAllCategories(appId: string, client: any) {
  const categories = (await client
    .db()
    .collection(COLL_PRESS_CATEGORIES)
    .find({ appId, hidden: { $not: { $eq: true } } })
    .toArray()) as PressCategoryType[];

  return categories;
}

async function getCurrentUserBadges(
  userId: string,
  appId: string,
  client: any
) {
  if (!userId) return null;
  const user = (await client
    .db()
    .collection(COLL_USERS)
    .findOne({ _id: userId, appId })) as UserType | null;

  return user;
}

export async function getVisibleCategoriesForUser(
  userId: string,
  appId: string
) {
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);
  try {
    await badgeChecker.init;
    const user = await getCurrentUserBadges(userId, appId, client);
    const allCategories = await getAllCategories(appId, client);
    const userBadges = user?.badges || [];

    badgeChecker.registerBadges((userBadges || []).map(({ id }) => id));
    allCategories.forEach((category) => {
      if (category.badges && category.badges.list.length > 0) {
        badgeChecker.registerBadges(category.badges.list.map(({ id }) => id));
      }
    });
    await badgeChecker.loadBadges();

    const filteredCategories = await Promise.all(
      allCategories.map(async (category) => {
        if (category.badges && category.badges.list.length > 0) {
          const results = await badgeChecker.checkBadges(
            userBadges,
            category.badges,
            { userId, appId }
          );

          if (!results.canList) return null;

          if (!results.canPreview || !results.canRead) {
            return {
              ...category,
              missingBadges: results.restrictedBy as Array<UserBadgeType>,
              previewOnly: true,
            };
          }
        }

        return {
          ...category,
          missingBadges: [],
          previewOnly: false,
        };
      })
    );

    return filteredCategories.filter((x) => x !== null);
  } finally {
    await badgeChecker.close();
    await client.close();
  }
}
