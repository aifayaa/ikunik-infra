import removeUserGeneratedContents from '../lib/removeUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import checkOwner from '../../libs/perms/checkOwner';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_delete',
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

    const isOwner = await checkOwner(appId, userGeneratedContentsId, COLL_USER_GENERATED_CONTENTS, 'userId', userId);

    if ((isOwner !== true) && (isOwner.code === 404 || !isModerator)) {
      return response(isOwner);
    }

    const options = { moderationInfo: isOwner ? null : 'content has been moderated' };
    const results = await removeUserGeneratedContents(
      appId,
      userId,
      userGeneratedContentsId,
      options,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
