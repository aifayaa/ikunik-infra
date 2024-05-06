/* eslint-disable import/no-relative-packages */
import { CrowdaaException } from '../../libs/httpResponses/crowdaaException';
import {
  APP_NOT_FOUND,
  ERROR_TYPE_NOT_FOUND,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterAppPrivateFields } from './appsUtils';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new CrowdaaException(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND,
        `The application with ID ${appId} was not found`
      );
    }

    return filterAppPrivateFields(app);
  } finally {
    client.close();
  }
};
