import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import pressArticleGetReactions from '../lib/pressArticleGetReactions';

export default async (event) => {
  const articleId = event.pathParameters.id;
  const {
    appId,
    principalId: userId,
  } = event.requestContext.authorizer;
  const { reactions: reactionsToReturn } = event.queryStringParameters || {};

  try {
    const reactions = await pressArticleGetReactions(
      appId,
      articleId,
      userId,
      reactionsToReturn,
    );
    return response({ code: 200, body: reactions });
  } catch (e) {
    return response(errorMessage(e));
  }
};
