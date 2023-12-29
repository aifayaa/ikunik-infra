import errorMessage from '../../libs/httpResponses/errorMessage';
import { getBalance } from '../lib/getBalance';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { deviceId = null } = (event.queryStringParameters || {});

  try {
    const results = await getBalance(appId, userId, deviceId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
