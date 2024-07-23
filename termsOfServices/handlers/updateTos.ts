/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import updateTos from '../lib/updateTos';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentType, documentTypes } from '../lib/type';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: tosId } = event.pathParameters as {
    id: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const updateTosSchema = z.object({
      title: z
        .string({
          required_error: 'title is required',
          invalid_type_error: 'title must be a string',
        })
        .trim(),
      html: z
        .string({
          required_error: 'html is required',
          invalid_type_error: 'html must be a string',
        })
        .trim(),
      type: z.enum(documentTypes as [DocumentType, ...DocumentType[]]),
      outdated: z.boolean(),
      required: z.boolean(),
    });

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    let validatedBody;
    try {
      validatedBody = updateTosSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { title, html, type, outdated, required } = validatedBody;

    const tos = await updateTos(appId, tosId, userId, {
      title,
      html,
      type,
      outdated,
      required,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: tos,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
