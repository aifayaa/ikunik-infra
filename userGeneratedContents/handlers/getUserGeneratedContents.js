/* eslint-disable import/no-relative-packages */
import getUserGeneratedContents from '../lib/getUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

const isBooleanStringOrUndefined = (val) =>
  typeof val === 'undefined' || !!(['true', 'false'].indexOf(val) + 1);

export default async (event) => {
  const userGeneratedContentsId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const { moderator = undefined, trashed = undefined } =
      event.queryStringParameters || {};

    if (
      !isBooleanStringOrUndefined(moderator) ||
      !isBooleanStringOrUndefined(trashed)
    ) {
      throw new Error('wrong_argument_value');
    }

    // Moderator only allowed parameters
    if (typeof moderator !== 'undefined' || typeof trashed !== 'undefined') {
      await checkPermsForApp(userId, appId, ['moderator']);
    }

    const results = await getUserGeneratedContents(
      appId,
      userGeneratedContentsId,
      {
        moderator,
        trashed,
      }
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
