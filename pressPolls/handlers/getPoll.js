/* eslint-disable import/no-relative-packages */
import getPoll from '../lib/getPoll';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;
  const params = event.queryStringParameters || {};

  try {
    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    let poll = await getPoll(pollId, appId, {
      userId,
      deviceId: params.deviceId,
    });

    if (!isAdmin) {
      const publicFields = [
        '_id',
        'allVotes',
        'canUpdate',
        'description',
        'displayResults',
        'endDate',
        'multipleChoices',
        'myVotes',
        'options',
        'requires',
        'startDate',
        'title',
      ];

      poll = publicFields.reduce((acc, key) => {
        acc[key] = poll[key];
        return acc;
      }, {});
    }

    return response({ code: 200, body: poll });
  } catch (exception) {
    return handleException(exception);
  }
};
