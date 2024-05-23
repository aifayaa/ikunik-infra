/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { nftSessionsStatus } from '../lib/nftSessionsStatus';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    const { principalId: userId, appId } = event.requestContext.authorizer;

    [appId, userId].forEach((item) => {
      if (!item) throw new Error('missing_argument');
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    const status = await nftSessionsStatus(userId, appId);

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: status });
  } catch (e) {
    return response(errorMessage(e));
  }
};
