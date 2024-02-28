/* eslint-disable import/no-relative-packages */
import getAppStatus from '../lib/getAppStatus';
import response from '../../libs/httpResponses/response';
import getPerms from '../../libs/perms/getPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'apps_getInfos';

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const perms = await getPerms(userId, appId);

  if (!checkPerms(permKey, perms)) {
    throw new Error('access_forbidden');
  }

  try {
    const results = await getAppStatus(appId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
