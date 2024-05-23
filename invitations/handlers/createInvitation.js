/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { createInvitation } from '../lib/createInvitation';
import { createInvitationSchema } from '../schemas/createInvitation.schema';
import { getUserLanguage } from '../../libs/intl/intl';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { filterSensitiveProperties } from '../utils/filterSensitiveProperties';

export default async (event) => {
  const { principalId: currentUserId } = event.requestContext.authorizer;

  try {
    let parsedInvitation = JSON.parse(event.body);

    // validation
    try {
      parsedInvitation = createInvitationSchema.parse(parsedInvitation);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    const currentUserLocale = getUserLanguage(event.headers);
    // current user right to create an invitation is determined in a step further
    const createdInvitationDocument = await createInvitation(
      currentUserId,
      parsedInvitation,
      currentUserLocale
    );

    return response({
      code: 200,
      body: filterSensitiveProperties(createdInvitationDocument),
    });
  } catch (error) {
    // TODO use a logger
    return response(errorMessage({ message: error.message }));
  }
};
