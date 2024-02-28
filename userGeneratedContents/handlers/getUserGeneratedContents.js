/* eslint-disable import/no-relative-packages */
import getUserGeneratedContents from '../lib/getUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

const isBooleanStringOrUndefined = (val) =>
  typeof val === 'undefined' || !!(['true', 'false'].indexOf(val) + 1);

export default async (event) => {
  const userGeneratedContentsId = event.pathParameters.id;
  const { appId, perms: rawPerms } = event.requestContext.authorizer;

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
      const perms = JSON.parse(rawPerms);
      const isModerator = checkPerms(permKeys, perms);
      if (!isModerator) {
        const error = new Error(
          'Unauthorized: this operation require moderator level rights'
        );
        error.code = 401;
        throw error;
      }
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
