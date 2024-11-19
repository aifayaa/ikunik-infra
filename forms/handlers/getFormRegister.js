/* eslint-disable import/no-relative-packages */
import getFormRegister from '../lib/getFormRegister';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { id: formId } = event.pathParameters;

  try {
    const form = await getFormRegister(formId);
    return response({ code: 200, body: form });
  } catch (e) {
    return response(errorMessage(e));
  }
};
