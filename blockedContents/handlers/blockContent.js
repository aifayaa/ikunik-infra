/* eslint-disable import/no-relative-packages */
import blockContent from '../lib/blockContent';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  const { id: contentId, type } = event.pathParameters;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    const results = await blockContent(userId, type, contentId, { appId });

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
