import metamaskLoginToken from '../lib/metamaskLoginToken';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    const {
      appId,
      userId,
      userMetamaskToken,
      wallet,
    } = JSON.parse(event.body);

    const valid = await metamaskLoginToken(appId, userId, userMetamaskToken, wallet);

    return response({ code: 200, body: { valid } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
