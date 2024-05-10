/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { updateInvitation } from '../lib/updateInvitation';
import { updateInvitationSchema } from '../schemas/updateInvitation.schema';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { makeIdSchema } from '../../libs/schemas/makeIdSchema';

export default async (event) => {
  const { principalId: currentUserId } = event.requestContext.authorizer;
  let invitationId = event.pathParameters.id;

  try {
    let parameters = JSON.parse(event.body);

    // validation
    try {
      invitationId = makeIdSchema('invitationId').parse(invitationId);
      parameters = updateInvitationSchema.parse(parameters);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const body = formatResponseBody({ errors });
      return response({ code: 200, body });
    }

    // current user right to update an invitation is determined in a step further
    const count = await updateInvitation(
      currentUserId,
      invitationId,
      parameters
    );

    return response({ code: 200, body: { count } });
  } catch (error) {
    // TODO use a logger
    return response(errorMessage({ message: error.message }));
  }
};
