/* eslint-disable import/no-relative-packages */
import _ from 'lodash';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { z } from 'zod';
import updateLegal from '../lib/updateLegal';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  LegalDocumentContentType,
  LegalDocumentType,
  documentTypes,
} from '../lib/type';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  LEGAL_DOCUMENT_NOT_FOUND_CODE,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

const { COLL_TOS } = mongoCollections;

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const updateLegalPathParametersSchema = z
      .object({
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

    const { id: legalDocumentId } = validatedPathParameters;

    const client = await MongoClient.connect();
    const currentLegalDocument: LegalDocumentContentType = await client
      .db()
      .collection(COLL_TOS)
      .findOne({ _id: legalDocumentId, appId });

    if (!currentLegalDocument) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LEGAL_DOCUMENT_NOT_FOUND_CODE,
        `Cannot found legal document '${legalDocumentId}' for application '${appId}'`
      );
    }

    const updateLegalSchema = z
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
        outdated: z.boolean(),
        required: z.boolean(),
      })
      .partial();

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);
    const validatedBody = updateLegalSchema.parse(body);

    const releventFields = ['title', 'html', 'type', 'outdated', 'required'];
    const effectiveOptions = _.pick(
      { ...currentLegalDocument, ...validatedBody },
      releventFields
    );

    const modifiedLegalDocument = await updateLegal(
      appId,
      legalDocumentId,
      userId,
      effectiveOptions
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: modifiedLegalDocument,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
