/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import pressArticleGetReactions from '../lib/pressArticleGetReactions';

export default async (event) => {
  const articleId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { types: reactionsToReturn } = event.queryStringParameters || {};

  try {
    const reactions = await pressArticleGetReactions(
      appId,
      articleId,
      userId,
      reactionsToReturn ? reactionsToReturn.split(',') : []
    );
    return response({ code: 200, body: reactions });
  } catch (e) {
    return response(errorMessage(e));
  }
};
