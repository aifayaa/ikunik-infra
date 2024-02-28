/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import ugcReact from '../lib/ugcReact';
import { getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  const { id: ugcId, reaction } = event.pathParameters;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const lang = getUserLanguage(event.headers);

  try {
    const ok = await ugcReact(appId, ugcId, userId, reaction, { lang });
    return response({ code: 200, body: ok });
  } catch (e) {
    return response(errorMessage(e));
  }
};
