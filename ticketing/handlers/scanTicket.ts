/* eslint-disable import/no-relative-packages */
import scanTicket from '../lib/scanTicket';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkFeaturePermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';

export const scanTicketSchema = z
  .object({
    location: z
      .object({
        label: z
          .string({
            required_error: 'location.label is required',
            invalid_type_error: 'location.label must be a string',
          })
          .min(1, { message: 'Must be 1 or more characters long' })
          .max(80, { message: 'Must be 80 or fewer characters long' })
          .trim(),
        geo: z.object({
          lat: z.number({
            required_error: 'location.geo.lat is required',
          }),
          lng: z.number({
            required_error: 'location.geo.lng is required',
          }),
        }),
      })
      .partial({ geo: true })
      .strict(),
    bookableId: z
      .string({
        required_error: 'bookableId is required',
        invalid_type_error: 'bookableId must be a string',
      })
      .min(1, { message: 'Must be 1 or more characters long' })
      .trim(),
  })
  .strict();

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { id: ticketId } = event.pathParameters as { id: string };

  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    await checkFeaturePermsForApp(userId, appId, ['ticketingScanner']);

    const body = JSON.parse(event.body);

    const validatedBody = scanTicketSchema.parse(body);

    const scannedTicket = await scanTicket(
      ticketId,
      appId,
      userId,
      validatedBody
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: scannedTicket,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
