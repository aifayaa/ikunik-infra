/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  ForumCategoryType,
  ForumTopicReplyType,
  ForumTopicType,
} from './forumEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
  FORUM_TOPIC_CODE,
} from '@libs/httpResponses/errorCodes';
import { arrayUniq, indexObjectArrayWithKey } from '@libs/utils';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';
import { getUserBadgesList } from './forumUtils';
import BadgeChecker from '@libs/badges/BadgeChecker';

const {
  COLL_FORUM_CATEGORIES,
  COLL_FORUM_TOPIC_REPLIES,
  COLL_FORUM_TOPICS,
  COLL_USERS,
} = mongoCollections;

type GetForumTopicRepliesParamsType = {
  start: number;
  limit: number;
  sortBy: 'creation' | 'lastMessage';
};

type GetForumTopicRepliesReturnedType = ForumTopicReplyType & {
  author?: {};
};

const getSortField = (sortBy: 'creation' | 'lastMessage') => {
  if (sortBy === 'creation') return [['createdAt', -1]];
  if (sortBy === 'lastMessage') return [['lastMessageAt', -1]];
  return [];
};

export default async (
  appId: string,
  topicId: string,
  userId: string,
  { start, limit, sortBy }: GetForumTopicRepliesParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const userBadges = await getUserBadgesList(userId, appId, { client });

    const topic = (await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .findOne({ _id: topicId, appId })) as ForumTopicType | null;

    if (!topic) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_TOPIC_CODE,
        `The forum topic ${topicId} was not found`
      );
    }

    const { categoryId } = topic;

    const category = (await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .findOne({ _id: categoryId, appId })) as ForumCategoryType | null;

    if (!category) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_CATEGORY_CODE,
        `The forum category ${categoryId} was not found`
      );
    }

    const badgeChecker = new BadgeChecker(appId);

    try {
      await badgeChecker.init;

      badgeChecker.registerBadges(userBadges.map(({ id }) => id));
      badgeChecker.registerBadges(topic.badges.list.map(({ id }) => id));
      badgeChecker.registerBadges(category.badges.list.map(({ id }) => id));
      await badgeChecker.loadBadges();

      const topicResults = await badgeChecker.checkBadges(
        userBadges,
        topic.badges,
        { userId }
      );
      const categoryResults = await badgeChecker.checkBadges(
        userBadges,
        category.badges,
        { userId }
      );
      const finalResults = topicResults.merge(categoryResults);
      if (!finalResults.canRead || !finalResults.canPreview) {
        return { items: [], totalCount: 0 };
      }
    } finally {
      await badgeChecker.close();
    }

    const searchQuery = { appId, categoryId, topicId };

    const sortField = getSortField(sortBy);

    const repliesList = (await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .find(searchQuery)
      .skip(start)
      .limit(limit)
      .sort(sortField)
      .toArray()) as GetForumTopicRepliesReturnedType[];

    const repliesCount = (await client
      .db()
      .collection(COLL_FORUM_TOPIC_REPLIES)
      .find(searchQuery)
      .count()) as number;

    const authorsIds = arrayUniq(repliesList.map(({ createdBy }) => createdBy));
    if (repliesList.length > 0) {
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
      repliesList.forEach((topic) => {
        if (indexedAuthors[topic.createdBy]) {
          topic.author = indexedAuthors[topic.createdBy];
        } else {
          topic.author = {};
        }
      });
    }

    return { items: repliesList, totalCount: repliesCount };
  } finally {
    await client.close();
  }
};
