/* eslint-disable import/no-relative-packages */
import checkOwner from '../../libs/perms/checkOwner';
import reviewUserGeneratedContents from '../lib/reviewUserGeneratedContents.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const isModerator = await checkPermsForApp(userId, appId, ['moderator'], {
      dontThrow: true,
    });
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
  } catch (e) {
    return response(errorMessage(e));
  }
};
