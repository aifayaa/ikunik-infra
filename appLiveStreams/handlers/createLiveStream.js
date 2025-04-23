/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { createAppLiveStream } from '../lib/createLiveStream';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';
import { getApp } from '../../apps/lib/appsUtils.ts';
import { filterOutput } from '../lib/utils';

const { COLL_LIVE_STREAMS } = mongoCollections;

export default async (event) => {
  try {
    const {
      appId,
      principalId: userId,
      superAdmin,
    } = event.requestContext.authorizer;

    if (!superAdmin) {
      const app = await getApp(appId);
      const allowed = await checkAppPlanForLimitIncrease(
        app,
        'liveStreams',
        async () => {
          const client = await MongoClient.connect();

          try {
            const count = await client
              .db()
              .collection(COLL_LIVE_STREAMS)
              .find({ appId })
              .count();

            return count;
          } finally {
            client.close();
          }
        }
      );
      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    try {
      await checkFeaturePermsForApp(userId, appId, ['appLiveStreaming']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const results = await createAppLiveStream(appId, {
      userId,
    });
    return response({ code: 200, body: filterOutput(results, true) });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
