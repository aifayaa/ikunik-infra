import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

import blockContent from '../lib/blockContent';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_ALLOWED,
  SELF_USER_BLOCK_CODE,
} from '../../libs/httpResponses/errorCodes.ts';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (event) => {
  const { id: contentId, type } = event.pathParameters;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    const client = await MongoClient.connect();

    if (type === 'user' && contentId === userId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        SELF_USER_BLOCK_CODE,
        `The user '${userId}' cannot block himself`
      );
    }

    if (type === 'userArticle') {
      const db = client.db();
      // Retrieve the user article
      const userArticle = await db
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({ _id: contentId, type: 'article' });

      // If the author of the article is the user who requests
      // to block the content, then throw an error
      if ((userArticle && userArticle.userId) === userId) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          SELF_USER_BLOCK_CODE,
          `The user '${userId}' cannot block his own article '${userArticle._id}'`
        );
      }
    }

    const results = await blockContent(userId, type, contentId, { appId });

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
