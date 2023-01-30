import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPerms } from '../../libs/perms/checkPerms';
import { generateContent, possibleFields } from '../lib/generateContent';
import { getUserLanguage } from '../../libs/intl/intl';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const {
      prompts,
    } = JSON.parse(event.body);

    if (!prompts || !prompts.title) {
      throw new Error('mal_formed_request');
    }

    Object.keys(prompts).forEach((field) => {
      if (possibleFields.indexOf(field) < 0 || typeof prompts[field] !== 'string') {
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
