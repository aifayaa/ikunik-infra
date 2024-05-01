/* eslint-disable import/no-relative-packages */
import getAppSetup from '../lib/getAppSetup';
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
    const params = event.queryStringParameters || {};

    const boolParams = Object.keys(params).reduce((acc, key) => {
      acc[key] = params[key] === 'true';
      return acc;
    }, {});

    const res = await getAppSetup(appId, boolParams);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
