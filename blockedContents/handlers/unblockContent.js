/* eslint-disable import/no-relative-packages */
import unblockContent from '../lib/unblockContent';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  const { id: contentId, type } = event.pathParameters;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    const results = await unblockContent(userId, type, contentId, { appId });

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
