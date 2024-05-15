/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import checkOwner from '../../libs/perms/checkOwner';
import reviewUserGeneratedContents from '../lib/reviewUserGeneratedContents';
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
    const bodyParsed = JSON.parse(event.body);
    const { moderated, reason } = bodyParsed;

    let ugc = null;
    let errMsg = null;
    ({ results: ugc, error: errMsg } = await checkOwner(
      appId,
      userGeneratedContentsId,
      COLL_USER_GENERATED_CONTENTS,
      'userId',
      userId,
      { safeExec: true }
    ));

    if (errMsg && (errMsg === 'content_not_found' || !isModerator)) {
      throw new Error(errMsg);
    }

    if (!ugc) {
      throw new Error('ugc_not_found');
    }

    if (typeof moderated !== 'boolean') {
      throw new Error('wrong_argument_type');
    }

    if (reason && typeof reason !== 'string') {
      throw new Error('wrong_argument_type');
    }

    const results = await reviewUserGeneratedContents(
      appId,
      userId,
      ugc,
      bodyParsed
    );

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  } finally {
    client.close();
  }
};
