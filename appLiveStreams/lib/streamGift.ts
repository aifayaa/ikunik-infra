import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  AppLiveStreamGiftType,
  AppLiveStreamType,
} from './appLiveStreamEntities';
import {
  ERROR_TYPE_NOT_FOUND,
  LIVE_STREAM_NOT_FOUND_CODE,
  PRODUCT_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { ArticlePrices, ArticlePricesKeys } from 'pressArticles/articlePrices';
import { getBalance } from 'userBalances/lib/getBalance';
import { addBalance } from 'userBalances/lib/addBalance';

const { COLL_APP_LIVE_STREAMS, COLL_APP_LIVE_STREAMS_GIFTS } = mongoCollections;

export default async (
  appId: string,
  liveStreamId: string,
  deviceId: string,
  userId: string | null,
  productId: (typeof ArticlePricesKeys)[number],
  amountInCurrency: string
) => {
  const client = await MongoClient.connect();

  try {
    const dbLiveStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({ _id: liveStreamId, appId })) as AppLiveStreamType | null;

    if (!dbLiveStream) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LIVE_STREAM_NOT_FOUND_CODE,
        `Cannot find live stream '${liveStreamId}' for app '${appId}'`
      );
    }

    const price = ArticlePrices[productId];

    if (!productId || !price) {
      throw new Error(PRODUCT_NOT_FOUND_CODE);
    }

    const balance = await getBalance(appId, userId, deviceId);

    if (!balance || price > balance.amount) {
      throw new Error('not_enough_wealth');
    }

    const operationStatus = await addBalance(
      appId,
      userId,
      deviceId,
      price * -1
    );
    if (!operationStatus) {
      throw new Error('balance_update_failed');
    }

    const toInsert: Omit<AppLiveStreamGiftType, '_id'> = {
      appId,
      userId,
      deviceId,
      liveStreamId,
      productId,
      amountInCurrency,
      giftTime: new Date(),
    };
    await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_GIFTS)
      .insertOne(toInsert);

    return { ok: true };
  } finally {
    await client.close();
  }
};
