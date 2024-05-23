/* eslint-disable import/no-relative-packages */
import updatePoll from '../lib/updatePoll';
import { updateFieldChecks } from '../lib/pollsFieldsChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(bodyParsed).forEach((field) => {
      const cb = updateFieldChecks[field];

      if (!cb || !cb(bodyParsed[field])) throw new Error('mal_formed_request');
    });

    const poll = await updatePoll(pollId, appId, userId, bodyParsed);
    return response({ code: 200, body: poll });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
