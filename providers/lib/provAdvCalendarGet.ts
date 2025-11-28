import { WordpressAPI } from '@libs/backends/wordpress';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (userId: string, appId: string) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `Application with id ${appId} not found`
      );
    }

    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });

    const wpUserId =
      user &&
      user.services &&
      user.services.wordpress &&
      user.services.wordpress.userId;

    if (!wpUserId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `User with id ${userId} not found or invalid`
      );
    }

    const wpApi = new WordpressAPI(app);

    const response = await wpApi.call(
      'GET',
      `/crowdaa-advent/v1/mobile/card?userId=${wpUserId}`
    );

    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch (e) {}
    }

    return response;
  } finally {
    await client.close();
  }
};
