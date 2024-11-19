/* eslint-disable import/no-relative-packages */
import createPoll from '../lib/createPoll';
import { createFieldChecks } from '../lib/pollsFieldsChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import MongoClient from '../../libs/mongoClient';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';
import { getApp } from '../../apps/lib/appsUtils.ts';

const { COLL_PRESS_POLLS } = mongoCollections;

export default async (event) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer;

  try {
    if (!superAdmin) {
      const app = await getApp(appId);
      const allowed = await checkAppPlanForLimitIncrease(
        app,
        'polls',
        async () => {
          const client = await MongoClient.connect();

          try {
            const count = await client
              .db()
              .collection(COLL_PRESS_POLLS)
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

    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(createFieldChecks).forEach((field) => {
      const cb = createFieldChecks[field];

      if (!cb(bodyParsed[field])) throw new Error('mal_formed_request');
    });

    const newPoll = await createPoll(appId, userId, bodyParsed);
    return response({ code: 200, body: newPoll });
  } catch (e) {
    return response(errorMessage(e));
  }
};
