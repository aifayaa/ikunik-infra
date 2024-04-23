/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import delApp from '../lib/delApp';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  try {
    const allowed = await checkPermsForApp(userId, appId, 'owner');
    if (!allowed) {
      throw new Error('access_forbidden');
    }
    const res = delApp(appId);

    return await response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
