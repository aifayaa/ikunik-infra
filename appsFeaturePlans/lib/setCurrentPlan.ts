import { getApp } from '@apps/lib/appsUtils';
import { FeaturePlanIdType } from './planTypes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
} from '@libs/httpResponses/errorCodes';
import mongoCollections from '@libs/mongoCollections.json';
import MongoClient from '@libs/mongoClient';

export type SetCurrentPlanArgsType = {
  featurePlanId: FeaturePlanIdType;
  startedAt?: string;
};

const { COLL_APPS } = mongoCollections;

export async function setCurrentPlanForAppId(
  appId: string,
  { featurePlanId, startedAt }: SetCurrentPlanArgsType
) {
  const client = await MongoClient.connect();

  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `App id ${appId} not found`
      );
    }

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The application '${appId}' is not found`,
        {
          details: {
            appId,
          },
        }
      );
    }

    let effectiveStartedAt = startedAt && new Date(startedAt);
    if (!effectiveStartedAt) {
      if (app.featurePlan && app.featurePlan.startedAt) {
        effectiveStartedAt = app.featurePlan.startedAt;
      } else {
        effectiveStartedAt = new Date();
      }
    }

    await db.collection(COLL_APPS).findOne(
      { _id: appId },
      {
        $set: {
          featurePlan: {
            _id: featurePlanId,
            startedAt: effectiveStartedAt,
          },
        },
      }
    );

    return app;
  } finally {
    client.close();
  }
}
