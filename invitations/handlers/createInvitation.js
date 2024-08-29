/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { createInvitation } from '../lib/createInvitation';
import { createInvitationSchema } from '../schemas/createInvitation.schema';
import { getUserLanguage } from '../../libs/intl/intl';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { filterSensitiveProperties } from '../utils/filterSensitiveProperties';

export default async (event) => {
  const { principalId: currentUserId } = event.requestContext.authorizer;

  try {
    const parsedInvitation = JSON.parse(event.body);

    // validation
    const validatedInvitation = createInvitationSchema.parse(parsedInvitation);

    const currentUserLocale = getUserLanguage(event.headers);
    // current user right to create an invitation is determined in a step further
    const createdInvitationDocument = await createInvitation(
      currentUserId,
      validatedInvitation,
      currentUserLocale
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterSensitiveProperties(createdInvitationDocument),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
