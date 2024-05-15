/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import checkOwner from '../../libs/perms/checkOwner';
import errorMessage from '../../libs/httpResponses/errorMessage';
import removeUserGeneratedContents from '../lib/removeUserGeneratedContents';
import response, { handleException } from '../../libs/httpResponses/response';
import mongoCollections from '../../libs/mongoCollections.json';
import { checkPermsForAppAux } from '../../libs/perms/checkPermsFor';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const client = MongoClient.connect();
  try {
    const isModerator = await checkPermsForAppAux(
      client.db(),
      userId,
      appId,
      'moderator'
    );
    const userGeneratedContentsId = event.pathParameters.id;

    let ugc = null;
    try {
      ugc = await checkOwner(
        appId,
        userGeneratedContentsId,
        COLL_USER_GENERATED_CONTENTS,
        'userId',
        userId
      );
    } catch (e) {
      const error = errorMessage(e);
      if (error.code === 404 || !isModerator) {
        return response(error);
      }
    }

    const options = {
      moderationInfo: ugc ? null : 'content has been moderated',
    };
    const results = await removeUserGeneratedContents(
      appId,
      userId,
      userGeneratedContentsId,
      options
    );
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  } finally {
    client.close();
  }
};
