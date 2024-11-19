/* eslint-disable import/no-relative-packages */
import editUserSettings, {
  allowedSettingsChecks,
} from '../lib/editUserSettings';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    if (userId !== urlId) {
      throw new Error('Forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const bodyKeys = Object.keys(bodyParsed);
    if (bodyKeys.length === 0) {
      throw new Error('missing_argument');
    }

    bodyKeys.forEach((key) => {
      const checkCb = allowedSettingsChecks[key];
      if (!checkCb) {
        throw new Error('wrong_argument_type');
      }
      if (!checkCb(bodyParsed[key])) {
        throw new Error('wrong_argument_type');
      }
    });

    const results = await editUserSettings(userId, appId, bodyParsed);
    return response({ code: 200, body: { updated: results } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
