/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollType } from './iapPollsTypes';
import {
  ERROR_TYPE_NOT_FOUND,
  IAP_POLL_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_PRESS_IAP_POLLS, COLL_PRESS_IAP_POLLS_VOTES } = mongoCollections;

export default async (iapPollId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const iapPollObj = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({
        _id: iapPollId,
        appId,
      })) as IapPollType | null;

    if (!iapPollObj) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_NOT_FOUND_CODE,
        `The IAP Poll '${iapPollId}' was not found`
      );
    }

    await client.db().collection(COLL_PRESS_IAP_POLLS).deleteOne({
      _id: iapPollId,
      appId,
    });

    return iapPollObj;
  } finally {
    client.close();
  }
};
