/* eslint-disable import/no-relative-packages */
import getMyBlockedContents from '../lib/getMyBlockedContents';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    const results = await getMyBlockedContents(userId, { appId });

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
