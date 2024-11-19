/* eslint-disable import/no-relative-packages */
import postFormRegisterAffiliate from '../lib/postFormRegisterAffiliate';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    if (typeof bodyParsed !== 'object') {
      throw new Error('wrong_argument_type');
    }

    const inserted = await postFormRegisterAffiliate(bodyParsed);
    return response({ code: 200, body: inserted });
  } catch (e) {
    return response(errorMessage(e));
  }
};
