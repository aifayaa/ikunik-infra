/* eslint-disable import/no-relative-packages */
import createBookable from '../lib/createBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { z } from 'zod';

export const createBookableSchema = z.object({
  name: z
    .string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    })
    .min(1, { message: 'Must be 1 or more characters long' })
    .max(80, { message: 'Must be 80 or fewer characters long' })
    .trim(),
  description: z
    .string({
      invalid_type_error: 'description must be a string',
    })
    .max(2000, { message: 'Must be 2000 or fewer characters long' })
    .trim(),
  disabled: z.boolean().optional().default(false),
  limits: z.object({
    notBefore: z
      .string({
        required_error: 'limits.notBefore is required',
        invalid_type_error: 'limits.notBefore must be a string',
      })
      .regex(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/,
        {
          message: 'Must be a date format',
        }
      )
      .trim()
      .transform((x) => new Date(x)),
    notAfter: z
      .string({
        required_error: 'limits.notAfter is required',
        invalid_type_error: 'limits.notAfter must be a string',
      })
      .regex(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/,
        {
          message: 'Must be a date format',
        }
      )
      .trim()
      .transform((x) => new Date(x)),
    maxTickets: z.number().int().gte(0).optional().default(0),
    maxTicketsPerAccount: z.number().int().gte(0).optional().default(0),
  }),
  pricingId: z.string().or(z.null()).optional().default(null),
  pictureId: z.string().or(z.null()).optional().default(null),
});

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const body = JSON.parse(event.body);

    const validatedBody = createBookableSchema.parse(body);

    const {
      name,
      description,
      disabled,
      limits: { notBefore, notAfter, maxTickets, maxTicketsPerAccount },
      pricingId,
      pictureId,
    } = validatedBody;

    const newBookable = await createBookable(appId, userId, {
      name,
      description,
      disabled,
      limits: {
        notBefore,
        notAfter,
        maxTickets,
        maxTicketsPerAccount,
      },
      pricingId,
      pictureId,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: newBookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
