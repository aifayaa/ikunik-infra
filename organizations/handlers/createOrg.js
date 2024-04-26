/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { createOrgSchema } from '../validators/createOrg.schema';
import { returnedFieldsFilter } from '../lib/fieldsChecks';
import createOrg from '../lib/createOrg';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = createOrgSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const org = await createOrg(userId, validatedBody);
    return response({ code: 200, body: returnedFieldsFilter(org) });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
