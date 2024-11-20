/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollOptionType, IapPollType } from './iapPollsTypes';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

type UpdateIapPollParamType = {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  options?: IapPollOptionType[];
  displayResults?: boolean;
  active?: boolean;
};

export default async (
  iapPollId: string,
  appId: string,
  userId: string,
  toSet: UpdateIapPollParamType
) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .updateOne(
        {
          _id: iapPollId,
          appId,
        },
        {
          $set: {
            ...toSet,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        }
      );

    const iapPollObj = (await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({
        _id: iapPollId,
        appId,
      })) as IapPollType | null;

    if (!iapPollObj) {
      throw new Error('content_not_found');
    }

    return iapPollObj;
  } finally {
    client.close();
  }
};
