/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { z } from 'zod';
import deleteLegal from '../lib/deleteLegal';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  LEGAL_DOCUMENT_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';

const { COLL_TOS } = mongoCollections;

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deleteLegalPathParametersSchema = z
      .object({
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

    const { id: legalDocumentId } = validatedPathParameters;

    const client = await MongoClient.connect();
    const currentLegalDocument = await client
      .db()
      .collection(COLL_TOS)
      .findOne(
        { _id: legalDocumentId, appId },
        {
          projection: {
            _id: 1,
            type: 1,
          },
        }
      );

    if (!currentLegalDocument) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LEGAL_DOCUMENT_NOT_FOUND_CODE,
        `Cannot found legal document '${legalDocumentId}' for application '${appId}'`
      );
    }

    const { type } = currentLegalDocument;

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
