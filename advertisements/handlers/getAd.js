/* eslint-disable import/no-relative-packages */
import getAd from '../lib/getAd';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const adId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newAd = await getAd(adId, appId);
    return response({ code: 200, body: newAd });
  } catch (e) {
    return response(errorMessage(e));
  }
};
