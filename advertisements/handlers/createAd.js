/* eslint-disable import/no-relative-packages */
import createAd from '../lib/createAd';
import { createFieldChecks } from '../lib/adsFieldsChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(createFieldChecks).forEach((field) => {
      const cb = createFieldChecks[field];

      if (!cb(bodyParsed[field])) throw new Error('mal_formed_request');
    });

    const newAd = await createAd(appId, userId, bodyParsed);
    return response({ code: 200, body: newAd });
  } catch (e) {
    return response(errorMessage(e));
  }
};
