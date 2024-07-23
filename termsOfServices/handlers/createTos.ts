/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import createTos from '../lib/createTos';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { DocumentType, documentTypes } from '../lib/type';

// type DocumentType = 'tos' | 'privacy';
// const documentTypes = ['tos', 'privacy'] as DocumentType[];

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const createTosSchema = z
      .object({
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
        type: z
          // .enum(documentTypes as [string, ...string[]])
          .enum(documentTypes as [DocumentType, ...DocumentType[]])
          // .enum(documentTypes as DocumentType[])
          .optional()
          .default('tos'),
        outdated: z.boolean().optional().default(false),
        required: z.boolean().optional().default(true),
      })
      .required();

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
      validatedBody = createTosSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { title, html, type, outdated, required } = validatedBody;

    const newTos = await createTos(appId, title, html, {
      userId,
      type,
      outdated,
      required,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: newTos,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
