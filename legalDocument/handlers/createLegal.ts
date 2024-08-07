/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import createLegal from '../lib/createLegal';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { LegalDocumentType, documentTypes } from '../lib/type';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const createLegalBodySchema = z
      .object({
        type: z.enum(
          documentTypes as [LegalDocumentType, ...LegalDocumentType[]]
        ),
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
    const validatedBody = createLegalBodySchema.parse(body);

    const { type, title, html, outdated, required } = validatedBody;

    const newLegalDocument = await createLegal(appId, title, html, {
      userId,
      type,
      outdated,
      required,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: newLegalDocument,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
