/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ADVERTISEMENTS } = mongoCollections;

export default async (adId, appId, userId, toSet) => {
  const client = await MongoClient.connect();

  try {
    if (toSet.limits) {
      toSet.limits.notBefore = new Date(toSet.limits.notBefore);
      toSet.limits.notAfter = new Date(toSet.limits.notAfter);
    }
    if (toSet['limits.notBefore'])
      toSet['limits.notBefore'] = new Date(toSet['limits.notBefore']);
    if (toSet['limits.notAfter'])
      toSet['limits.notAfter'] = new Date(toSet['limits.notAfter']);

    await client
      .db()
      .collection(COLL_ADVERTISEMENTS)
      .updateOne(
        {
          _id: adId,
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

    const adObj = await client.db().collection(COLL_ADVERTISEMENTS).findOne({
      _id: adId,
      appId,
    });

    if (!adObj) {
      throw new Error('content_not_found');
    }

    const changes = {};
    if (
      adObj.limits.maxDisplays &&
      adObj.limits.maxDisplays - adObj.counters.displays !==
        adObj.remaining.displays
    ) {
      changes['remaining.displays'] =
        adObj.limits.maxDisplays - adObj.counters.displays;
    } else if (
      !adObj.limits.maxDisplays &&
      adObj.remaining.displays !== Infinity
    ) {
      changes['remaining.displays'] = Infinity;
    }

    if (
      adObj.limits.maxClicks &&
      adObj.limits.maxClicks - adObj.counters.clicks !== adObj.remaining.clicks
    ) {
      changes['remaining.clicks'] =
        adObj.limits.maxClicks - adObj.counters.clicks;
    } else if (!adObj.limits.maxClicks && adObj.remaining.clicks !== Infinity) {
      changes['remaining.clicks'] = Infinity;
    }

    if (Object.keys(changes).length > 0) {
      await client.db().collection(COLL_ADVERTISEMENTS).updateOne(
        {
          _id: adId,
          appId,
        },
        { $set: changes }
      );
    }

    return adObj;
  } finally {
    client.close();
  }
};
