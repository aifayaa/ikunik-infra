/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import getLiveStreams from '../lib/getLiveStreams';

function stringToBool3(x) {
  if (x === 'true') return true;
  if (x === 'false') return false;
  return null;
}
function stringToBool2(x) {
  if (x === 'true') return true;
  return null;
}

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { id, start, limit, active, users } = event.queryStringParameters || {};

  try {
    const results = await getLiveStreams(appId, userId, {
      id,
      start,
      limit,
      active: stringToBool3(active),
      users: stringToBool2(users),
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
