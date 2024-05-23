/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { generateContent, possibleFields } from '../lib/generateContent';
import { getUserLanguage } from '../../libs/intl/intl';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    await checkPermsForApp(userId, appId, ['admin']);

    const { prompts } = JSON.parse(event.body);

    if (!prompts || !prompts.title) {
      throw new Error('mal_formed_request');
    }

    Object.keys(prompts).forEach((field) => {
      if (
        possibleFields.indexOf(field) < 0 ||
        typeof prompts[field] !== 'string'
      ) {
        throw new Error('mal_formed_request');
      }
    });

    const lang = getUserLanguage(event.headers);

    const queryId = await generateContent(prompts, lang, { appId, userId });
    return response({
      code: 200,
      body: {
        queryId,
      },
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};
