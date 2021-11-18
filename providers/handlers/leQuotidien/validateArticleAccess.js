import validateArticleAccess from '../../lib/leQuotidien/validateArticleAccess';
import response from '../../../libs/httpResponses/response';
import errorMessage from '../../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    const {
      appId,
      userId,
      articleId,
    } = event.queryStringParameters || {};

    await validateArticleAccess(
      appId,
      userId,
      articleId,
    );

    return ({
      statusCode: 200,
      body: '',
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};
