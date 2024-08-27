/* eslint-disable import/no-relative-packages */
import createPoll from '../lib/createPoll';
import { createFieldChecks } from '../lib/pollsFieldsChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import MongoClient from '../../libs/mongoClient';

const { COLL_PRESS_POLLS } = mongoCollections;

export default async (event) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer;

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitIncrease(
        appId,
        'liveStreams',
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
        throw new Error('app_limits_exceeded');
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
    return response(errorMessage({ message: e.message }));
  }
};
