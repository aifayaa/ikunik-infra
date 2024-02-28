/* eslint-disable import/no-relative-packages */
import getAd from '../lib/getAd';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const adId = event.pathParameters.id;

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const newAd = await getAd(adId, appId);
    return response({ code: 200, body: newAd });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
