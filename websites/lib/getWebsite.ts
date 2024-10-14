/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  ERROR_TYPE_NOT_FOUND,
  WEBSITE_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { WebsiteType } from './websiteTypes';

const { COLL_WEBSITES } = mongoCollections;

export default async (websiteId: string) => {
  const client = await MongoClient.connect();
  try {
    const website = (await client
      .db()
      .collection(COLL_WEBSITES)
      .findOne({ _id: websiteId })) as WebsiteType | null;

    if (!website) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        WEBSITE_NOT_FOUND_CODE,
        `Website ${websiteId} not found`
      );
    }

    return website;
  } finally {
    client.close();
  }
};
