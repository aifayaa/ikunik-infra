/* eslint-disable import/no-relative-packages */
import deleteAd from '../lib/deleteAd';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const adId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newAd = await deleteAd(adId, appId);
    return response({ code: 200, body: newAd });
  } catch (exception) {
    return handleException(exception);
  }
};
