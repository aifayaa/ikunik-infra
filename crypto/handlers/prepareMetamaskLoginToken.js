/* eslint-disable import/no-relative-packages */
import prepareMetamaskLoginToken from '../lib/prepareMetamaskLoginToken';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  try {
    const lang = getUserLanguage(event.headers);

    const results = await prepareMetamaskLoginToken(appId, userId, lang);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
