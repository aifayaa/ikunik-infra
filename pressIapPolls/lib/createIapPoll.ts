/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollOptionType, IapPollType } from './iapPollsTypes';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

type CreateIapPollParamType = {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  options: IapPollOptionType[];
  displayResults: boolean;
  active: boolean;
};

export default async (
  appId: string,
  userId: string,
  iapPollData: CreateIapPollParamType
) => {
  const client = await MongoClient.connect();

  try {
    const newIapPollObj: IapPollType = {
      ...iapPollData,
      _id: new ObjectID().toString(),
      appId,
      createdBy: userId,
      createdAt: new Date(),
    };

    await client.db().collection(COLL_PRESS_IAP_POLLS).insertOne(newIapPollObj);

    return newIapPollObj;
  } finally {
    client.close();
  }
};
