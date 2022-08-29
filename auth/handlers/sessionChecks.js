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

    await sessionChecks(userId, appId, loginToken && JSON.parse(loginToken));

    return response({ code: 200, body: { status: 'success' } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
