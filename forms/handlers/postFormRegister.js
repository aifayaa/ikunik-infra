import postFormRegister from '../lib/postFormRegister';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    if (typeof bodyParsed !== 'object') {
      throw new Error('wrong_argument_type');
    }

    const lang = getUserLanguage(event.headers);
    const inserted = await postFormRegister(bodyParsed, lang);
    return response({ code: 200, body: inserted });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
