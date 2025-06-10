/* eslint-disable import/no-relative-packages */
import { AppType } from '@apps/lib/appEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  CHAT_NOT_CONFIGURED_CODE,
  ERROR_TYPE_SETUP,
} from '@libs/httpResponses/errorCodes';
import { UserType } from '@users/lib/userEntity';
import { escapeRegex } from '@libs/utils';

const { COLL_APPS, COLL_USERS } = mongoCollections;

function makeUsernameRegex(search: string) {
  const searchParts = search.split('*').map(escapeRegex);

  const regexp = searchParts.join('.*');

  return new RegExp(regexp, 'i');
}

type ChatUsersSearchParams = {
  start: number;
  limit: number;
  search: string;
};

export default async (
  appId: string,
  { start, limit, search }: ChatUsersSearchParams
) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app: AppType | null = await db.collection(COLL_APPS).findOne({
      _id: appId,
      'credentials.firebase.config': { $exists: true },
    });

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        CHAT_NOT_CONFIGURED_CODE,
        `The app '${appId}' was not found`
      );
    }

    const searchQuery: Record<string, any> = {
      appId,
      $or: [
        { 'emails.address': search },
        { 'profile.username': makeUsernameRegex(search) },
      ],
    };

    const users: Array<UserType> = await db
      .collection(COLL_USERS)
      .find(searchQuery, {
        projection: {
          profile: 1,
        },
      })
      .skip(start)
      .limit(limit)
      .toArray();

    const usersCount = await db
      .collection(COLL_USERS)
      .find(searchQuery, {
        projection: {
          profile: 1,
        },
      })
      .count();

    return {
      list: users,
      count: usersCount,
    };
  } finally {
    client.close();
  }
};
