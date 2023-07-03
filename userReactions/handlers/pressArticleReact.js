import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import pressArticleReact from '../lib/pressArticleReact';

export default async (event) => {
  const { id: articleId, reaction } = event.pathParameters;
  const {
    appId,
    principalId: userId,
  } = event.requestContext.authorizer;

  try {
    const ok = await pressArticleReact(appId, articleId, userId, reaction);
    return response({ code: 200, body: ok });
  } catch (e) {
    return response(errorMessage(e));
  }
};
