/* eslint-disable import/no-relative-packages */
import addUserBadge from '../lib/addUserBadge';
import fieldChecks from '../lib/badgeFieldsChecks';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(fieldChecks).forEach((field) => {
      const cb = fieldChecks[field];

      if (!cb(bodyParsed[field])) throw new Error('mal_formed_request');
    });

    const userBadge = await addUserBadge(userId, appId, bodyParsed);
    return response({ code: 200, body: { userBadge } });
  } catch (exception) {
    return handleException(exception);
  }
};
