/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import deleteLegal from '../lib/deleteLegal';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { LegalDocumentType, documentTypes } from '../lib/type';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deleteLegalPathParametersSchema = z
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

    const validatedPathParameters = deleteLegalPathParametersSchema.parse(
      event.pathParameters
    );

    const { type, id: legalDocumentId } = validatedPathParameters;

    const deletedResources = await deleteLegal(appId, type, legalDocumentId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: deletedResources,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
