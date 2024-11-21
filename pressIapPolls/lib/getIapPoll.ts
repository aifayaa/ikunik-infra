/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollType } from './iapPollsTypes';
import {
  ERROR_TYPE_NOT_FOUND,
  IAP_POLL_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

export default async (iapPollId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const iapPoll = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({ _id: iapPollId, appId })) as IapPollType;

    if (!iapPoll) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_NOT_FOUND_CODE,
        `The IAP Poll '${iapPollId}' was not found`
      );
    }

    return iapPoll;
  } finally {
    client.close();
  }
};
