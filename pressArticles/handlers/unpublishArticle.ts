/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import MongoClient from '@libs/mongoClient';
import response from '../../libs/httpResponses/response';
import {
  unpublishArticlesInDb,
  unpublishArticlesNotifications,
} from '../lib/unpublishArticles';
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

    const client = await MongoClient.connect();
    const db = await client.db();
    // Documentation, how to use transaction:
    // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
    await client.withSession(
      async (sessionArg: {
        withTransaction: (session: unknown) => Promise<void>;
      }) => {
        await sessionArg.withTransaction(async (session: unknown) => {
          await unpublishArticlesInDb(queryArticlesToUnpublish, {
            db,
            session,
            userId,
          });
        });
      }
    );
    await unpublishArticlesNotifications(queryArticlesToUnpublish, db);

    return response({ code: 200, body: { articleId } });
  } catch (e) {
    return response({ code: 500, message: (e as Error).message });
  }
};
