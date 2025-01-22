import Lambda from 'aws-sdk/clients/lambda';
import {
  CrowdSearchMassUpdateBadgesActionType,
  CrowdSearchMassUpdateBadgesIdsType,
  CrowdSearchMassUpdateFiltersType,
} from './crowdTypes';
import MongoClient from '@libs/mongoClient';
import mongoViews from '@libs/mongoViews.json';
import mongoCollections from '@libs/mongoCollections.json';
import { buildCrowdSearchPipeline } from './crowdUtils';
import { syncUserBadges } from '@libs/wordpress/wordpressApiSync';

const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;
const { COLL_APPS, COLL_USERS } = mongoCollections;

const USERS_PROCESSING_BATCHES = 200;

const { STAGE } = process.env as { STAGE: string };

const lambda = new Lambda({
  region: process.env.REGION,
});

type SearchItemType = {
  _id: string;
};

export type CrowdMassUpdateBadgesApplyEventType = {
  appId: string;
  filters: CrowdSearchMassUpdateFiltersType;
  action: CrowdSearchMassUpdateBadgesActionType;
  badgeIds: CrowdSearchMassUpdateBadgesIdsType;
};

export default async (
  appId: string,
  filters: CrowdSearchMassUpdateFiltersType,
  action: CrowdSearchMassUpdateBadgesActionType,
  badgeIds: CrowdSearchMassUpdateBadgesIdsType
) => {
  const invokeArgs: CrowdMassUpdateBadgesApplyEventType = {
    appId,
    filters,
    action,
    badgeIds,
  };
  await lambda
    .invokeAsync({
      FunctionName: `crowd-${STAGE}-crowdMassUpdateBadgesApply`,
      InvokeArgs: JSON.stringify(invokeArgs),
    })
    .promise();

  return {
    ok: true,
  };
};

export async function crowdMassUpdateBadgesApply({
  appId,
  filters,
  action,
  badgeIds,
}: CrowdMassUpdateBadgesApplyEventType) {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    const pipeline = buildCrowdSearchPipeline(appId, filters);

    const itemsCursor = db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([
        ...pipeline,
        { $match: { userId: { $ne: null } } },
        { $group: { _id: '$userId' } },
      ]);

    let pendingPromises = [];
    const badgesObjectsIds = badgeIds.map((id) => ({
      id,
      status: 'assigned',
    }));

    while (await itemsCursor.hasNext()) {
      const { _id }: SearchItemType = await itemsCursor.next();

      const promise = (async () => {
        await db.collection(COLL_USERS).updateOne(
          { _id, appId },
          {
            $pull: {
              badges: { id: { $in: badgeIds } },
            },
          }
        );
        if (action === 'addBadges') {
          await db.collection(COLL_USERS).updateOne(
            { _id, appId },
            {
              $addToSet: {
                badges: { $each: badgesObjectsIds },
              },
            }
          );
        }

        if (app.backend && app.backend.type === 'wordpress') {
          const user = await db.collection(COLL_USERS).findOne({ _id, appId });
          if (user) {
            await syncUserBadges(user);
          }
        }
      })();

      pendingPromises.push(promise);

      if (pendingPromises.length > USERS_PROCESSING_BATCHES) {
        await Promise.all(pendingPromises);
        pendingPromises = [];
      }
    }

    if (pendingPromises.length > 0) {
      await Promise.all(pendingPromises);
    }
  } finally {
    client.close();
  }
}
