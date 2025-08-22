import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import getLiveStream from './getLiveStream';
import { AppLiveStreamLogLineType } from './appLiveStreamEntities';

const { COLL_APP_LIVE_STREAMS_LOGS } = mongoCollections;

type GetLiveStreamRecordingMessagesParamsType = {
  fromTime: Date;
  toTime: Date;
  limit: number;
};

export default async (
  appId: string,
  liveStreamId: string,
  { fromTime, toTime, limit }: GetLiveStreamRecordingMessagesParamsType
) => {
  const client = await MongoClient.connect();

  try {
    await getLiveStream(liveStreamId, appId); // Just to ensure that the livestream exists

    const messages = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_LOGS)
      .find({
        appId,
        liveStreamId,
        sendTime: { $gte: fromTime, $lte: toTime },
      })
      .sort([['sendTime', 1]])
      .limit(limit)
      .toArray()) as Array<AppLiveStreamLogLineType>;

    const messagesCount: number = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_LOGS)
      .find({
        appId,
        liveStreamId,
        sendTime: { $gte: fromTime, $lte: toTime },
      })
      .count();

    const totalCount: number = await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS_LOGS)
      .find({
        appId,
        liveStreamId,
      })
      .count();

    return { items: messages, count: messagesCount, totalCount };
  } finally {
    await client.close();
  }
};
