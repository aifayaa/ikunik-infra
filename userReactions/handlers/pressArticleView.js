import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import pressArticleView from '../lib/pressArticleView';

export default async (event) => {
  const articleId = event.pathParameters.id;
  const {
    appId,
    principalId: userId,
  } = event.requestContext.authorizer;

  try {
    const ok = await pressArticleView(appId, articleId, userId);
    return response({ code: 200, body: ok });
  } catch (e) {
    return response(errorMessage(e));
  }
};
