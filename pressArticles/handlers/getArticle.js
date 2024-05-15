/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { getArticle } from '../lib/getArticle';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForAppAux } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: articleId } = event.pathParameters;
    const { deviceId = null } = event.queryStringParameters || {};

    const client = await MongoClient.connect();
    const publishedOnly = !(await checkPermsForAppAux(
      client.db(),
      userId,
      appId,
      'admin'
    ));

    const results = await getArticle(articleId, appId, {
      deviceId,
      getPictures: true,
      publishedOnly,
      userId,
    });

    if (!results) {
      return response({ code: 404, message: 'article_not_found' });
    }

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
