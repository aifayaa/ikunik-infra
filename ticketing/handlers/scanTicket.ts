/* eslint-disable import/no-relative-packages */
import scanTicket from '../lib/scanTicket';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import checkScannerPermsForTicket from 'ticketing/lib/checkScannerPermsForTicket';

export const scanTicketSchema = z.object({
  locationLabel: z
    .string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    })
    .min(1, { message: 'Must be 1 or more characters long' })
    .max(80, { message: 'Must be 80 or fewer characters long' })
    .trim(),
  geo: z.object({
    lat: z.number({
      required_error: 'lat is required',
    }),
    lon: z.number({
      required_error: 'lon is required',
    }),
  }),
});

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const ticketId = event.pathParameters.id;

  try {
    await checkScannerPermsForTicket(ticketId, appId, userId);

    const body = JSON.parse(event.body);

    const validatedBody = scanTicketSchema
      .partial({
        geo: true,
      })
      .parse(body);

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
