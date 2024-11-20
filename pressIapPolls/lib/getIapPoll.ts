/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollType } from './iapPollsTypes';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

export default async (iapPollId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const iapPoll = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({ _id: iapPollId, appId })) as IapPollType;

    if (!iapPoll) {
      throw new Error('content_not_found');
    }

    return iapPoll;
  } finally {
    client.close();
  }
};
