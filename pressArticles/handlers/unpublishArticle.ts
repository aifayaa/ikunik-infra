/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response from '../../libs/httpResponses/response';
import { unpublishArticles } from '../lib/unpublishArticles';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
    };

    await checkPermsForApp(userId, appId, ['admin']);

    const { id: articleId } = event.pathParameters as { id: string };

    const queryArticlesToUnpublish = {
      _id: { $in: [articleId] },
      appId,
    };
    await unpublishArticles(queryArticlesToUnpublish);

    return response({ code: 200, body: { articleId } });
  } catch (e) {
    return response({ code: 500, message: (e as Error).message });
  }
};
