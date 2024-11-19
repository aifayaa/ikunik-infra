/* eslint-disable import/no-relative-packages */
import editFormRegister from '../lib/editFormRegister';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { id: formId } = event.pathParameters;

  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    if (typeof bodyParsed !== 'object') {
      throw new Error('wrong_argument_type');
    }

    const edited = await editFormRegister(formId, bodyParsed);
    return response({ code: 200, body: edited });
  } catch (e) {
    return response(errorMessage(e));
  }
};
