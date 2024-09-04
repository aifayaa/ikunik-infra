import { LiveStreamDurationType } from './liveStreamTypes';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { ComputedFeatureSpecification2Type } from 'appsFeaturePlans/lib/planTypes';

const { COLL_LIVE_STREAMS_DURATIONS } = mongoCollections;

type ComputeLiveStreamDurationParamsType = {
  from: Date;
  to: Date;
};

export default async function computeLiveStreamDuration(
  appId: string,
  params: ComputeLiveStreamDurationParamsType
) {
  const client = await MongoClient.connect();

  try {
    let totalDuration = 0;
    const { from: periodStartDate, to: periodResetDate } = params;
    const durations = (await client
      .db()
      .collection(COLL_LIVE_STREAMS_DURATIONS)
      .find({
        appId,
        $or: [
          { startTime: { $exists: true }, endTime: { $exists: false } },
          {
            $and: [
              { startTime: { $lt: periodResetDate } },
              { startTime: { $gte: periodStartDate } },
            ],
          },
          {
            $and: [
              { endTime: { $lt: periodResetDate } },
              { endTime: { $gte: periodStartDate } },
            ],
          },
        ],
      })
      .toArray()) as LiveStreamDurationType[];

    durations.forEach((entry) => {
      if (!entry.startTime) {
        return;
      }

      const startTime = entry.startTime;
      const endTime = entry.endTime || new Date();
      const currentTotalDuration =
        entry.duration || endTime.getTime() - startTime.getTime();

      if (startTime >= periodStartDate && endTime < periodResetDate) {
        totalDuration += currentTotalDuration;
      } else if (startTime < periodStartDate && endTime >= periodStartDate) {
        totalDuration += endTime.getTime() - periodStartDate.getTime();
      } else if (startTime < periodResetDate && endTime >= periodResetDate) {
        totalDuration += periodResetDate.getTime() - startTime.getTime();
      }
    });

    return totalDuration;
  } finally {
    client.close();
  }
}
