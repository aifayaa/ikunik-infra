/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { createAppLiveStream } from '../lib/createLiveStream';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';
import { filterOutput } from '../lib/utils';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

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
