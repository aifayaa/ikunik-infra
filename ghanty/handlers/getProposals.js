import getProposals from '../lib/getProposals';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const queryString = event.queryStringParameters || {};

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const body = await getProposals(appId, userId, queryString);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
