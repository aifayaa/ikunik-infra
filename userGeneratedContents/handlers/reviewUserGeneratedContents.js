import checkOwner from '../../libs/perms/checkOwner';
import errorMessage from '../../libs/httpResponses/errorMessage';
import reviewUserGeneratedContents from '../lib/reviewUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

const {
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const isModerator = checkPerms(permKeys, perms);

  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const userGeneratedContentsId = event.pathParameters.id;
    const bodyParsed = JSON.parse(event.body);
    const {
      reason,
      valid,
    } = bodyParsed;

    let ugc = null;
    let errMsg = null;
    ({ results: ugc, error: errMsg } = await checkOwner(
      appId,
      userGeneratedContentsId,
      COLL_USER_GENERATED_CONTENTS,
      'userId',
      userId,
      { safeExec: true },
    ));

    if (errMsg && (errMsg === 'content_not_found' || !isModerator)) {
      throw new Error(errMsg);
    }

    if (!ugc) {
      throw new Error('ugc_not_found');
    }

    if (typeof valid !== 'boolean') {
      throw new Error('wrong_argument_type');
    }

    if (reason && typeof reason !== 'string') {
      throw new Error('wrong_argument_type');
    }

    const results = await reviewUserGeneratedContents(
      appId,
      userId,
      ugc,
      bodyParsed,
    );

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
