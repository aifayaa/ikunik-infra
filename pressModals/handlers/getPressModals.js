import errorMessage from '../../libs/httpResponses/errorMessage';
import getPressModals from '../lib/getPressModals';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const {
      appId,
      principalId: userId,
    } = event.requestContext.authorizer;
    const searchParams = event.queryStringParameters || {};

    const modals = await getPressModals(appId, searchParams, { userId });

    return response({ code: 200, body: modals });
  } catch (e) {
    return response(errorMessage(e));
  }
};
