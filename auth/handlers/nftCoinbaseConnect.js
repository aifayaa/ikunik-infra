/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { nftCoinbaseConnect } from '../lib/nftCoinbaseConnect';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { principalId: userId, appId } = event.requestContext.authorizer;
    const { code } = JSON.parse(event.body);

    [code, appId, userId].forEach((item) => {
      if (!item) throw new Error('missing_argument');
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    const result = await nftCoinbaseConnect(userId, code, appId);

    /* get User in db or create new one if not exists */
    return response({ code: 200, body: result });
  } catch (e) {
    return response(errorMessage(e));
  }
};
