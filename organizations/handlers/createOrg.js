/* eslint-disable import/no-relative-packages */
import { createFieldChecks, returnedFieldsFilter } from '../lib/fieldsChecks';
import createOrg from '../lib/createOrg';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    Object.keys(createFieldChecks).forEach((field) => {
      const cb = createFieldChecks[field];

      if (!cb(bodyParsed[field], bodyParsed)) {
        throw new Error('mal_formed_request');
      }
    });

    const org = await createOrg(userId, bodyParsed);
    return response({ code: 200, body: returnedFieldsFilter(org) });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
