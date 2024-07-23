/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import updateLegal from '../lib/updateLegal';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { LegalDocumentType, documentTypes } from '../lib/type';
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

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const updateLegalPathParametersSchema = z
      .object({
        type: z.enum(
          documentTypes as [LegalDocumentType, ...LegalDocumentType[]]
        ),
        id: z
          .string({
            required_error: 'id path parameter is required',
            invalid_type_error: 'id must be a string',
          })
          .trim(),
      })
      .required();

    const validatedPathParameters = updateLegalPathParametersSchema.parse(
      event.pathParameters
    );

    const { type, id: legalDocumentId } = validatedPathParameters;

    const updateLegalSchema = z.object({
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
      validatedBody = updateLegalSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    const { title, html, outdated, required } = validatedBody;

    const tos = await updateLegal(appId, legalDocumentId, userId, {
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
