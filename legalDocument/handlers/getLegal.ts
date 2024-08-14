/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyEventQueryStringParameters,
} from 'aws-lambda';
import getLegal from '../lib/getLegal';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

function computeOptions(
  pathParameters: APIGatewayProxyEventPathParameters | null,
  queryStringParameters: APIGatewayProxyEventQueryStringParameters | null
) {
  let options: {
    id?: string;
    outdated?: boolean;
    required?: boolean;
  } = {};

  const getLegalParametersSchema = z.object({
    id: z.string().optional(),
  });

  if (pathParameters) {
    const validatedParameters = getLegalParametersSchema.parse(pathParameters);
    options = { ...options, ...validatedParameters };
  }

  const outdated = queryStringParameters?.outdated
    ? queryStringParameters?.outdated === 'true'
    : undefined;
  if (outdated !== undefined) {
    options = { ...options, outdated };
  }

  const required = queryStringParameters?.required
    ? queryStringParameters?.required === 'true'
    : undefined;
  if (required !== undefined) {
    options = { ...options, required };
  }

  return options;
}

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as { appId: string };

  try {
    const options = computeOptions(
      event.pathParameters,
      event.queryStringParameters
    );

    const { id: legalDocumentId, outdated, required } = options;

    const legalDocument = await getLegal(appId, {
      legalDocumentId,
      outdated,
      required,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: legalDocument,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
