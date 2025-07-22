/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { ForumTopicType } from './forumEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  FORUM_CATEGORY_CODE,
} from '@libs/httpResponses/errorCodes';
import { arrayUniq, indexObjectArrayWithKey } from '@libs/utils';
import { userPrivateFieldsProjection } from '@users/lib/usersUtils';

const { COLL_FORUM_CATEGORIES, COLL_FORUM_TOPICS, COLL_USERS } =
  mongoCollections;

type GetForumCategoryTopicsParamsType = {
  start: number;
  limit: number;
  sortBy: 'recent' | 'popular' | 'solved';
};

type GetForumCategoryTopicsReturnedType = ForumTopicType & {
  author?: {};
};

function getSortField(sortBy: 'recent' | 'popular' | 'solved') {
  switch (sortBy) {
    case 'popular':
      return [
        ['stats.viewsCount', -1],
        ['createdAt', -1],
      ];
    case 'solved':
      return [
        ['solved', -1],
        ['createdAt', -1],
      ];
    case 'recent':
    default:
      return [['createdAt', -1]];
  }
}

export default async (
  appId: string,
  categoryId: string,
  { start, limit, sortBy }: GetForumCategoryTopicsParamsType
) => {
  const client = await MongoClient.connect();

  try {
    const category = await client
      .db()
      .collection(COLL_FORUM_CATEGORIES)
      .findOne({ _id: categoryId, appId });

    if (!category) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FORUM_CATEGORY_CODE,
        `The forum category ${categoryId} was not found`
      );
    }

    const searchQuery = { appId, categoryId };

    const sortField = getSortField(sortBy);

    const topicsList = (await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .find(searchQuery)
      .skip(start)
      .limit(limit)
      .sort(sortField)
      .toArray()) as GetForumCategoryTopicsReturnedType[];

    const topicsCount = (await client
      .db()
      .collection(COLL_FORUM_TOPICS)
      .find(searchQuery)
      .count()) as number;

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
              );

      const indexedAuthors = indexObjectArrayWithKey(authors);
      topicsList.forEach((topic) => {
        if (indexedAuthors[topic.createdBy]) {
          topic.author = indexedAuthors[topic.createdBy];
        } else {
          topic.author = {};
        }
      });
    }

    return { items: topicsList, totalCount: topicsCount };
  } finally {
    await client.close();
  }
};
