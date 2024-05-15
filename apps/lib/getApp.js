/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

// TODO: Move to 'apps/lib/appsUtils.js'
export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The application '${appId}' is not found`,
        {
          details: {
            appId,
          },
        }
      );
    }

    return app;
  } finally {
    client.close();
  }
};
