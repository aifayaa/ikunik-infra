/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import getBuildsStatus from '../lib/getBuildsStatus';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  try {
    if (!appId) throw new Error('no_app_found');
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const res = await getBuildsStatus(appId);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage(e));
  }
};
