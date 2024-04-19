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

    const result = await setAppSetup(appId);
    let status = '';

    if (result) {
      status = {
        build: true,
      };
    } else {
      throw new Error('start_build_failed');
    }

    return response({ code: 200, body: status });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
