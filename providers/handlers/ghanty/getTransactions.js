import getTransactions from '../../lib/ghanty/getTransactions';
import errorMessage from '../../../libs/httpResponses/errorMessage';
import response from '../../../libs/httpResponses/response';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const queryString = event.queryStringParameters || {};

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const body = await getTransactions(appId, userId, queryString);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
