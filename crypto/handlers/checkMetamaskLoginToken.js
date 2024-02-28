/* eslint-disable import/no-relative-packages */
import checkMetamaskLoginToken from '../lib/checkMetamaskLoginToken';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    const { appId, userId, userMetamaskToken } = JSON.parse(event.body);

    const valid = await checkMetamaskLoginToken(
      appId,
      userId,
      userMetamaskToken
    );

    return response({ code: 200, body: { valid } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
