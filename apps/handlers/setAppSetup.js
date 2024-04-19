/* eslint-disable import/no-relative-packages */
import setAppSetup from '../lib/setAppSetup';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const appId = event.pathParameters.id;
  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const res = await setAppSetup(appId);

    if (!res) return response({ code: 500, body: { build: false } });
    return response({ code: 201, body: { build: true } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
