import response from '../../libs/httpResponses/response';
import sessionChecks from '../lib/sessionChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    const {
      appId,
      loginToken,
      principalId: userId,
    } = event.requestContext.authorizer;

    const data = await sessionChecks(userId, appId, loginToken && JSON.parse(loginToken));

    if (data) {
      return response({ code: 200, body: { success: true, data } });
    }

    return response({ code: 200, body: { success: false } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
