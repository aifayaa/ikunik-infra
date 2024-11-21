/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { IapPollOptionType, IapPollType } from './iapPollsTypes';
import {
  ERROR_TYPE_NOT_FOUND,
  IAP_POLL_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

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
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        IAP_POLL_NOT_FOUND_CODE,
        `The IAP Poll '${iapPollId}' was not found`
      );
    }

    return iapPollObj;
  } finally {
    client.close();
  }
};
